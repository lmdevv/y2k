'use node'

import { createOpencodeClient, type Config, type Session } from '@opencode-ai/sdk'
import { Daytona } from '@daytona/sdk'
import { v } from 'convex/values'
import { action } from './_generated/server'
import { api, internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { uploadVideoBuffer, waitForMuxAssetReady } from './mux'

const DEFAULT_SNAPSHOT_NAME = 'y2k-runner'
const DEFAULT_OPENCODE_PORT = 4096
const RENDER_POLL_INTERVAL_MS = 5000
const RENDER_HEARTBEAT_INTERVAL_MS = 30000
const RENDER_TIMEOUT_MS = 1000 * 60 * 12
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
    `Missing Daytona snapshot "${snapshotName}" in this org. ` +
      `Build and push it first with: nix develop -c pnpm --dir frontend daytona:snapshot ` +
      `(set DAYTONA_RUNNER_SNAPSHOT in Convex env if you use a custom snapshot name).`,
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

function titleFromPrompt(prompt: string) {
  return prompt.length > 60 ? `${prompt.slice(0, 57)}...` : prompt
}

function requireData<T>(value: { data?: T | null; error?: unknown }, message: string) {
  if (!value.data) {
    throw new Error(message)
  }
  return value.data
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && /no such file|not found|does not exist/i.test(error.message)
}

async function startPrompt(prompt: string, previewUrl: string) {
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

  const state: {
    settled: boolean
    error: unknown
  } = {
    settled: false,
    error: null,
  }

  void client.session
    .prompt({
      path: { id: session.id },
      body: {
        system: renderSystemPrompt(),
        parts: [{ type: 'text', text: userPrompt(prompt) }],
      },
    })
    .then((promptResult) => {
      requireData(promptResult, 'OpenCode did not return a response.')
      state.settled = true
    })
    .catch((error) => {
      state.error = error
      state.settled = true
    })

  return {
    sessionId: session.id,
    state,
  }
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

async function detectRenderedVideoPath(
  sandbox: Awaited<ReturnType<typeof createRunnerSandbox>>,
) {
  const response = await sandbox.process.executeCommand(
    [
      "python3 - <<'PY'",
      'import json',
      'from pathlib import Path',
      '',
      'render_dir = Path("/workspace/new/renders")',
      'files = []',
      'if render_dir.exists():',
      '    for path in sorted(render_dir.glob("*.mp4")):',
      '        if path.is_file():',
      '            files.append({',
      '                "path": str(path),',
      '                "name": path.name,',
      '                "size": path.stat().st_size,',
      '            })',
      'print(json.dumps(files))',
      'PY',
    ].join('\n'),
  )

  const files = JSON.parse(response.result) as Array<{
    path: string
    name: string
    size: number
  }>

  const candidates = files
    .filter((file) => !file.name.startsWith('.') && !file.name.endsWith('_temp.mp4'))
    .filter((file) => file.size > 0)
    .sort((left, right) => {
      if (left.name === 'final.mp4') {
        return -1
      }
      if (right.name === 'final.mp4') {
        return 1
      }
      return right.size - left.size
    })

  return candidates[0]?.path
}

async function waitForRenderOutput(options: {
  sandbox: Awaited<ReturnType<typeof createRunnerSandbox>>
  prompt: string
  promptState: {
    settled: boolean
    error: unknown
  }
  onHeartbeat: () => Promise<void>
}) {
  const deadline = Date.now() + RENDER_TIMEOUT_MS
  let lastHeartbeatAt = 0
  let fallbackVideoPath: string | undefined

  while (Date.now() < deadline) {
    if (Date.now() - lastHeartbeatAt >= RENDER_HEARTBEAT_INTERVAL_MS) {
      await options.onHeartbeat()
      lastHeartbeatAt = Date.now()
    }

    try {
      const manifest = await downloadManifest(options.sandbox)
      if (manifest.status === 'ok' && manifest.videoPath) {
        return manifest
      }
      if (manifest.status === 'error') {
        throw new Error(manifest.error ?? 'The agent reported a render failure.')
      }
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error
      }
    }

    fallbackVideoPath ??= await detectRenderedVideoPath(options.sandbox)

    if (options.promptState.error) {
      if (fallbackVideoPath) {
        return {
          status: 'ok',
          title: titleFromPrompt(options.prompt),
          description: options.prompt,
          videoPath: fallbackVideoPath,
        } satisfies RenderManifest
      }

      throw options.promptState.error
    }

    if (options.promptState.settled && fallbackVideoPath) {
      return {
        status: 'ok',
        title: titleFromPrompt(options.prompt),
        description: options.prompt,
        videoPath: fallbackVideoPath,
      } satisfies RenderManifest
    }

    await sleep(RENDER_POLL_INTERVAL_MS)
  }

  if (fallbackVideoPath) {
    return {
      status: 'ok',
      title: titleFromPrompt(options.prompt),
      description: options.prompt,
      videoPath: fallbackVideoPath,
    } satisfies RenderManifest
  }

  throw new Error('Timed out waiting for the rendered video output.')
}

function summarizeError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown error'
}

const Y2K_RUNNER_SANDBOX_LABELS: Record<string, string> = {
  app: 'y2k',
  purpose: 'video-agent',
}
const Y2K_SANDBOX_LIST_PAGE = 100

async function deleteSandboxById(sandboxId: string | undefined) {
  if (!sandboxId) {
    return
  }

  const daytona = createDaytonaClient()

  try {
    const sandbox = await daytona.get(sandboxId)
    await daytona.delete(sandbox, 0)
  } catch (error) {
    if (isNotFoundError(error)) {
      return
    }
  }
}

/**
 * Catches y2k video sandboxes that still exist in Daytona but are no longer in Convex
 * (e.g. DB reset while a sandbox was still running).
 */
async function deleteY2kRunnerSandboxesForJobIds(jobIdStrings: Set<string>) {
  if (jobIdStrings.size === 0) {
    return
  }

  const daytona = createDaytonaClient()
  let page = 1

  for (;;) {
    const result = await daytona.list(
      Y2K_RUNNER_SANDBOX_LABELS,
      page,
      Y2K_SANDBOX_LIST_PAGE,
    )

    for (const sandbox of result.items) {
      const jobLabel = sandbox.labels?.jobId
      if (jobLabel && jobIdStrings.has(jobLabel)) {
        try {
          await daytona.delete(sandbox, 0)
        } catch {
          // Best-effort: sandbox may already be gone or busy deleting.
        }
      }
    }

    if (result.items.length < Y2K_SANDBOX_LIST_PAGE) {
      return
    }

    page += 1
  }
}

export const sendVideoPrompt = action({
  args: {
    conversationId: v.id('conversations'),
    prompt: v.string(),
  },
  returns: v.object({
    jobId: v.id('videoJobs'),
    assistantMessageId: v.id('messages'),
    userMessageId: v.id('messages'),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    jobId: Id<'videoJobs'>
    assistantMessageId: Id<'messages'>
    userMessageId: Id<'messages'>
  }> => {
    return await ctx.runMutation(internal.chat.createVideoRequest, {
      conversationId: args.conversationId,
      prompt: args.prompt,
    })
  },
})

export const createChat = action({
  args: {
    clientSessionId: v.string(),
  },
  returns: v.id('conversations'),
  handler: async (ctx, args): Promise<Id<'conversations'>> => {
    return await ctx.runMutation(api.chat.createNewConversation, {
      clientSessionId: args.clientSessionId,
    })
  },
})

export const deleteChat = action({
  args: {
    conversationId: v.id('conversations'),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const jobs: Array<Doc<'videoJobs'>> = await ctx.runQuery(
      internal.chat.listConversationJobs,
      { conversationId: args.conversationId },
    )

    for (const job of jobs) {
      await deleteSandboxById(job.sandboxId)
    }

    await ctx.runMutation(internal.chat.deleteConversationInternal, {
      conversationId: args.conversationId,
    })
    return null
  },
})

export const resetChatSession = action({
  args: {
    clientSessionId: v.string(),
  },
  returns: v.id('conversations'),
  handler: async (ctx, args): Promise<Id<'conversations'>> => {
    const jobs: Array<Doc<'videoJobs'>> = await ctx.runQuery(
      internal.chat.listAllVideoJobsForClientSession,
      {
        clientSessionId: args.clientSessionId,
      },
    )

    const idStrings = new Set<string>(jobs.map((job) => String(job._id)))

    for (const job of jobs) {
      await deleteSandboxById(job.sandboxId)
    }

    await deleteY2kRunnerSandboxesForJobIds(idStrings)

    return await ctx.runMutation(internal.chat.hardResetClientSession, {
      clientSessionId: args.clientSessionId,
    })
  },
})

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

      const promptRun = await startPrompt(job.prompt, server.previewUrl)
      await ctx.runMutation(internal.chat.updateJob, {
        jobId: job._id,
        opencodeSessionId: promptRun.sessionId,
      })
      const manifest = await waitForRenderOutput({
        sandbox,
        prompt: job.prompt,
        promptState: promptRun.state,
        onHeartbeat: async () => {
          await ctx.runMutation(internal.chat.updateJob, {
            jobId: job._id,
            status: 'agent_running',
          })
        },
      })

      if (manifest.status !== 'ok' || !manifest.videoPath) {
        throw new Error(manifest.error ?? 'The agent did not produce a finished video.')
      }

      await ctx.runMutation(internal.chat.updateJob, {
        jobId: job._id,
        status: 'render_complete',
        resultPath: manifest.videoPath,
        opencodeSessionId: promptRun.sessionId,
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

      const muxReady = await waitForMuxAssetReady({
        uploadId: upload.id,
      })

      if (muxReady) {
        const videoId = await ctx.runMutation(internal.videos.createGenerated, {
          title: manifest.title ?? titleFromPrompt(job.prompt),
          description: manifest.description ?? job.prompt,
          muxPlaybackId: muxReady.playbackId,
          durationSeconds: muxReady.durationSeconds,
          conversationId: job.conversationId,
          jobId: job._id,
        })

        await ctx.runMutation(internal.chat.completeJob, {
          jobId: job._id,
          muxAssetId: muxReady.assetId,
          muxPlaybackId: muxReady.playbackId,
          videoId,
        })
      }

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

export const reconcileMuxProcessingJob = action({
  args: {
    jobId: v.id('videoJobs'),
  },
  returns: v.object({
    ok: v.boolean(),
    status: v.optional(v.literal('waiting')),
    videoId: v.optional(v.id('videos')),
    muxAssetId: v.optional(v.string()),
    muxPlaybackId: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    ok: boolean
    status?: 'waiting'
    videoId?: Id<'videos'>
    muxAssetId?: string
    muxPlaybackId?: string
  }> => {
    const job: Doc<'videoJobs'> | null = await ctx.runQuery(internal.chat.getJob, {
      jobId: args.jobId,
    })
    if (!job) {
      throw new Error('Job not found')
    }
    if (!job.muxUploadId) {
      throw new Error('Job does not have a Mux upload id')
    }

    const muxReady = await waitForMuxAssetReady({
      uploadId: job.muxUploadId,
    })

    if (!muxReady) {
      return {
        ok: false,
        status: 'waiting',
      }
    }

    const videoId: Id<'videos'> = await ctx.runMutation(internal.videos.createGenerated, {
      title: titleFromPrompt(job.prompt),
      description: job.prompt,
      muxPlaybackId: muxReady.playbackId,
      durationSeconds: muxReady.durationSeconds,
      conversationId: job.conversationId,
      jobId: job._id,
    })

    await ctx.runMutation(internal.chat.completeJob, {
      jobId: job._id,
      muxAssetId: muxReady.assetId,
      muxPlaybackId: muxReady.playbackId,
      videoId,
    })

    return {
      ok: true,
      videoId,
      muxAssetId: muxReady.assetId,
      muxPlaybackId: muxReady.playbackId,
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
