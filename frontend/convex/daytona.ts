'use node'

import { createOpencodeClient, type Config, type Session } from '@opencode-ai/sdk'
import { Daytona } from '@daytona/sdk'
import { v } from 'convex/values'
import { action } from './_generated/server'
import { internal } from './_generated/api'
import { uploadVideoBuffer } from './mux'

const DEFAULT_SNAPSHOT_NAME = 'y2k-runner'
const DEFAULT_OPENCODE_PORT = 4096
const FORWARDED_ENV_KEYS = [
  'ZEN_API_KEY',
  'OPENCODE_CONFIG',
  'OPENCODE_MODEL',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_API_KEY',
]

function createDaytonaClient() {
  const apiKey = process.env.DAYTONA_API_KEY
  if (!apiKey) {
    throw new Error('Missing required environment variable: DAYTONA_API_KEY')
  }

  return new Daytona({
    apiKey,
    apiUrl: process.env.DAYTONA_API_URL,
  })
}

function isNotFoundError(error: unknown) {
  return error instanceof Error && /not found/i.test(error.message)
}

function getRunnerSnapshotName() {
  return process.env.DAYTONA_RUNNER_SNAPSHOT ?? DEFAULT_SNAPSHOT_NAME
}

function safeParseConfig() {
  const raw = process.env.OPENCODE_CONFIG_CONTENT
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function buildOpencodeConfig(): Config {
  const base = safeParseConfig() as Record<string, unknown>
  const basePermission =
    base.permission && typeof base.permission === 'object'
      ? (base.permission as Record<string, unknown>)
      : {}

  return {
    ...base,
    permission: {
      ...basePermission,
      edit: 'allow',
      bash: 'allow',
      webfetch: 'allow',
      external_directory: 'deny',
      doom_loop: 'deny',
    },
  }
}

function shellEscape(value: string) {
  return `'${value.replace(/'/g, `'"'"'`)}'`
}

function collectSandboxEnv() {
  return Object.fromEntries(
    FORWARDED_ENV_KEYS.flatMap((name) => {
      const value = process.env[name]
      return value ? [[name, value]] : []
    }),
  )
}

async function waitForPreview(url: string, attempts = 20, delayMs = 1500) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'X-Daytona-Skip-Preview-Warning': 'true' },
      })
      if (response.ok || response.status === 404) {
        return
      }
    } catch {
      // Service is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  throw new Error('Timed out waiting for sandbox preview to become reachable')
}

async function ensureRunnerSnapshot() {
  const daytona = createDaytonaClient()
  const snapshotName = getRunnerSnapshotName()

  try {
    return await daytona.snapshot.get(snapshotName)
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error
    }
  }

  throw new Error(
    `Missing Daytona snapshot "${snapshotName}". Build it first with "nix develop -c pnpm --dir frontend daytona:snapshot".`,
  )
}

async function createRunnerSandbox(jobId: string) {
  const snapshot = await ensureRunnerSnapshot()
  const daytona = createDaytonaClient()
  const sandboxName = `y2k-video-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`

  return await daytona.create({
    snapshot: snapshot.name,
    name: sandboxName,
    language: 'typescript',
    envVars: collectSandboxEnv(),
    autoStopInterval: 0,
    autoArchiveInterval: 60 * 24,
    labels: {
      app: 'y2k',
      purpose: 'video-agent',
      jobId,
    },
  })
}

async function prepareWorkspace(sandbox: Awaited<ReturnType<typeof createRunnerSandbox>>) {
  await sandbox.process.executeCommand(
    [
      'set -e',
      'mkdir -p /workspace/new/scenes /workspace/new/renders',
      'rm -f /workspace/new/result.json',
      'rm -rf /workspace/new/scenes/*',
      'rm -rf /workspace/new/renders/*',
    ].join(' && '),
  )
}

async function startOpencodeServer(
  sandbox: Awaited<ReturnType<typeof createRunnerSandbox>>,
  options: {
    port?: number
    hostname?: string
    previewExpiresInSeconds?: number
  } = {},
) {
  const port = options.port ?? DEFAULT_OPENCODE_PORT
  const hostname = options.hostname ?? '0.0.0.0'
  const sessionId = `opencode-${crypto.randomUUID()}`
  const config = shellEscape(JSON.stringify(buildOpencodeConfig()))

  await sandbox.process.executeCommand(
    `pkill -f ${shellEscape(`opencode serve --port ${port}`)} || true`,
  )
  await sandbox.process.createSession(sessionId)
  await sandbox.process.executeSessionCommand(sessionId, {
    command: `OPENCODE_CONFIG_CONTENT=${config} opencode serve --port ${port} --hostname ${hostname}`,
    runAsync: true,
  })

  const preview = await sandbox.getSignedPreviewUrl(
    port,
    options.previewExpiresInSeconds ?? 3600,
  )
  await waitForPreview(preview.url)

  return {
    sessionId,
    previewUrl: preview.url,
    port,
  }
}

function renderSystemPrompt() {
  return [
    'You are an autonomous video generation agent running inside a Daytona sandbox.',
    'Work only under /workspace.',
    'Read /workspace/AGENTS.md and use the bundled skills when useful.',
    'Create all new scene code under /workspace/new/scenes.',
    'Render the final mp4 under /workspace/new/renders/final.mp4.',
    'Always write /workspace/new/result.json as valid JSON with keys status, title, description, videoPath, error.',
    'Use status="ok" when the render succeeds and status="error" when it fails.',
    'Do not ask follow-up questions. Make reasonable decisions and continue.',
    'Validate quickly first, then produce a final medium-quality render suitable for fast playback.',
    'Your final textual response should be short because the caller will read result.json.',
  ].join(' ')
}

function userPrompt(prompt: string) {
  return [
    'Generate an educational video for this request:',
    prompt,
    'Use the preloaded Manim corpus as reference if it helps.',
    'When done, ensure /workspace/new/result.json points at the rendered mp4.',
  ].join('\n\n')
}

function requireData<T>(value: { data?: T | null; error?: unknown }, message: string) {
  if (!value.data) {
    throw new Error(message)
  }
  return value.data
}

async function runPrompt(prompt: string, previewUrl: string) {
  const client = createOpencodeClient({
    baseUrl: previewUrl,
    directory: '/workspace',
  })

  const sessionResult = await client.session.create({
    body: {
      title: prompt.length > 60 ? `${prompt.slice(0, 57)}...` : prompt,
    },
  })
  const session = requireData<Session>(
    sessionResult,
    'OpenCode could not create a session.',
  )

  const promptResult = await client.session.prompt({
    path: { id: session.id },
    body: {
      system: renderSystemPrompt(),
      parts: [{ type: 'text', text: userPrompt(prompt) }],
    },
  })
  requireData(promptResult, 'OpenCode did not return a response.')

  return session.id
}

type RenderManifest = {
  status?: string
  title?: string
  description?: string
  videoPath?: string
  error?: string
}

async function downloadManifest(sandbox: Awaited<ReturnType<typeof createRunnerSandbox>>) {
  const content = await sandbox.fs.downloadFile('/workspace/new/result.json')
  return JSON.parse(content.toString()) as RenderManifest
}

async function downloadRenderedVideo(
  sandbox: Awaited<ReturnType<typeof createRunnerSandbox>>,
  videoPath: string,
) {
  return await sandbox.fs.downloadFile(videoPath)
}

function summarizeError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown error'
}

export const runVideoJob = action({
  args: {
    jobId: v.id('videoJobs'),
  },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.chat.getJob, { jobId: args.jobId })
    if (!job) {
      throw new Error('Job not found')
    }

    let sandbox: Awaited<ReturnType<typeof createRunnerSandbox>> | null = null

    try {
      await ctx.runMutation(internal.chat.updateJob, {
        jobId: job._id,
        status: 'sandbox_starting',
      })
      await ctx.runMutation(internal.chat.updateAssistantMessage, {
        messageId: job.assistantMessageId,
        body: 'Starting sandbox...',
        status: 'pending',
      })

      sandbox = await createRunnerSandbox(job._id)

      await ctx.runMutation(internal.chat.updateJob, {
        jobId: job._id,
        sandboxId: sandbox.id,
        sandboxName: sandbox.name,
      })

      await prepareWorkspace(sandbox)
      const server = await startOpencodeServer(sandbox)

      await ctx.runMutation(internal.chat.updateJob, {
        jobId: job._id,
        status: 'agent_running',
        opencodeSessionId: server.sessionId,
      })
      await ctx.runMutation(internal.chat.updateAssistantMessage, {
        messageId: job.assistantMessageId,
        body: 'Generating video...',
        status: 'pending',
      })

      const opencodeSessionId = await runPrompt(job.prompt, server.previewUrl)
      const manifest = await downloadManifest(sandbox)

      if (manifest.status !== 'ok' || !manifest.videoPath) {
        throw new Error(manifest.error ?? 'The agent did not produce a finished video.')
      }

      await ctx.runMutation(internal.chat.updateJob, {
        jobId: job._id,
        status: 'render_complete',
        resultPath: manifest.videoPath,
        opencodeSessionId,
      })
      await ctx.runMutation(internal.chat.updateAssistantMessage, {
        messageId: job.assistantMessageId,
        body: 'Uploading to Mux...',
        status: 'pending',
      })

      const file = await downloadRenderedVideo(sandbox, manifest.videoPath)

      await ctx.runMutation(internal.chat.updateJob, {
        jobId: job._id,
        status: 'uploading_to_mux',
      })

      const upload = await uploadVideoBuffer({
        data: file,
        jobId: job._id,
      })

      await ctx.runMutation(internal.chat.updateJob, {
        jobId: job._id,
        status: 'mux_processing',
        muxUploadId: upload.id,
      })
      await ctx.runMutation(internal.chat.updateAssistantMessage, {
        messageId: job.assistantMessageId,
        body: 'Processing on Mux...',
        status: 'pending',
      })

      return {
        ok: true,
        sandboxId: sandbox.id,
        uploadId: upload.id,
      }
    } catch (error) {
      await ctx.runMutation(internal.chat.failJob, {
        jobId: job._id,
        error: summarizeError(error),
      })

      return {
        ok: false,
        error: summarizeError(error),
      }
    } finally {
      if (sandbox) {
        try {
          await sandbox.delete()
        } catch {
          // Cleanup is best-effort once the render/upload flow is finished.
        }
      }
    }
  },
})

export const ensureSnapshot = action({
  args: {
    force: v.optional(v.boolean()),
  },
  handler: async () => {
    const snapshot = await ensureRunnerSnapshot()

    return {
      snapshot: snapshot.name,
      state: snapshot.state,
      imageName: snapshot.imageName,
    }
  },
})

export const getSandbox = action({
  args: {},
  handler: async () => {
    const snapshot = await ensureRunnerSnapshot()
    return {
      snapshot: snapshot.name,
      state: snapshot.state,
      imageName: snapshot.imageName,
    }
  },
})
