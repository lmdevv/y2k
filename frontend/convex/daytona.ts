'use node'

import { Daytona, Image } from '@daytona/sdk'
import { v } from 'convex/values'
import { action } from './_generated/server'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_SNAPSHOT_NAME = 'y2k-runner'
const DEFAULT_OPENCODE_PORT = 4096
const FORWARDED_ENV_KEYS = [
  'ZEN_API_KEY',
  'OPENCODE_CONFIG',
  'OPENCODE_CONFIG_CONTENT',
  'OPENCODE_MODEL',
]

const convexDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(convexDir, '..')
const runnerDockerfile = path.join(repoRoot, '..', 'runner', 'Dockerfile')

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

function numberEnv(name: string, fallback: number) {
  const raw = process.env[name]
  if (!raw) {
    return fallback
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric environment variable: ${name}=${raw}`)
  }

  return parsed
}

function isNotFoundError(error: unknown) {
  return error instanceof Error && /not found/i.test(error.message)
}

function getRunnerSnapshotName() {
  return process.env.DAYTONA_RUNNER_SNAPSHOT ?? DEFAULT_SNAPSHOT_NAME
}

function buildRunnerImage() {
  return Image.fromDockerfile(runnerDockerfile)
}

function buildRunnerResources() {
  return {
    cpu: numberEnv('DAYTONA_RUNNER_CPU', 2),
    memory: numberEnv('DAYTONA_RUNNER_MEMORY', 4),
    disk: numberEnv('DAYTONA_RUNNER_DISK', 8),
  }
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

async function ensureRunnerSnapshot(options: {
  force?: boolean
  onLogs?: (chunk: string) => void
} = {}) {
  const daytona = createDaytonaClient()
  const snapshotName = getRunnerSnapshotName()

  if (options.force) {
    try {
      const existing = await daytona.snapshot.get(snapshotName)
      await daytona.snapshot.delete(existing)
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error
      }
    }
  } else {
    try {
      return await daytona.snapshot.get(snapshotName)
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error
      }
    }
  }

  return daytona.snapshot.create(
    {
      name: snapshotName,
      image: buildRunnerImage(),
      resources: buildRunnerResources(),
    },
    {
      onLogs: options.onLogs,
    },
  )
}

async function createRunnerSandbox(options: {
  conversationId?: string
  name?: string
  autoStopInterval?: number
  autoArchiveInterval?: number
}) {
  const snapshot = await ensureRunnerSnapshot()
  const daytona = createDaytonaClient()

  return daytona.create({
    snapshot: snapshot.name,
    name:
      options.name ??
      `y2k-chat-${options.conversationId ?? Date.now().toString()}`,
    language: 'typescript',
    envVars: collectSandboxEnv(),
    autoStopInterval: options.autoStopInterval ?? 30,
    autoArchiveInterval: options.autoArchiveInterval ?? 60 * 24,
    labels: {
      app: 'y2k',
      purpose: 'chat',
      ...(options.conversationId
        ? { conversationId: options.conversationId }
        : {}),
    },
  })
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

  await sandbox.process.createSession(sessionId)
  await sandbox.process.executeSessionCommand(sessionId, {
    command: `opencode serve --port ${port} --hostname ${hostname}`,
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
    previewToken: preview.token,
    port,
  }
}

export const createChatSandbox = action({
  args: {
    conversationId: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const sandbox = await createRunnerSandbox({
      conversationId: args.conversationId,
    })
    const server = await startOpencodeServer(sandbox)

    return {
      sandboxId: sandbox.id,
      sandboxName: sandbox.name,
      sessionId: server.sessionId,
      previewUrl: server.previewUrl,
      port: server.port,
      snapshot: sandbox.snapshot,
      state: sandbox.state,
    }
  },
})

export const ensureSnapshot = action({
  args: {
    force: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    const snapshot = await ensureRunnerSnapshot({ force: args.force })

    return {
      snapshot: snapshot.name,
      state: snapshot.state,
      imageName: snapshot.imageName,
    }
  },
})

export const getSandbox = action({
  args: {
    sandboxId: v.string(),
  },
  handler: async (_ctx, args) => {
    const daytona = createDaytonaClient()
    const sandbox = await daytona.get(args.sandboxId)

    return {
      sandboxId: sandbox.id,
      sandboxName: sandbox.name,
      snapshot: sandbox.snapshot,
      state: sandbox.state,
      createdAt: sandbox.createdAt,
      updatedAt: sandbox.updatedAt,
      labels: sandbox.labels,
    }
  },
})

export const deleteSandbox = action({
  args: {
    sandboxId: v.string(),
  },
  handler: async (_ctx, args) => {
    const daytona = createDaytonaClient()
    const sandbox = await daytona.get(args.sandboxId)
    await sandbox.delete()

    return { sandboxId: args.sandboxId, deleted: true }
  },
})
