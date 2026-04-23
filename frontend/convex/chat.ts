import { v } from 'convex/values'
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'

const DEFAULT_CONVERSATION_TITLE = 'Video Agent Chat'
const ACTIVE_JOB_STALE_MS = 1000 * 60 * 20

const activeJobStatuses = new Set([
  'queued',
  'sandbox_starting',
  'agent_running',
  'render_complete',
  'uploading_to_mux',
  'mux_processing',
])

function trimPrompt(prompt: string) {
  return prompt.trim()
}

function titleFromPrompt(prompt: string) {
  return prompt.length > 60 ? `${prompt.slice(0, 57)}...` : prompt
}

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>
}

async function listSessionConversations(
  ctx: QueryCtx | MutationCtx,
  clientSessionId: string,
) {
  const conversations = await ctx.db
    .query('conversations')
    .withIndex('by_client_session', (q) => q.eq('clientSessionId', clientSessionId))
    .collect()

  return conversations.sort((left, right) => right.updatedAt - left.updatedAt)
}

async function createConversation(
  ctx: MutationCtx,
  clientSessionId: string,
) {
  const now = Date.now()

  return await ctx.db.insert('conversations', {
    clientSessionId,
    title: DEFAULT_CONVERSATION_TITLE,
    createdAt: now,
    updatedAt: now,
  })
}

async function listActiveJobs(
  ctx: QueryCtx | MutationCtx,
  conversationId?: Id<'conversations'>,
) {
  const jobs = conversationId
    ? await ctx.db
        .query('videoJobs')
        .withIndex('by_conversation', (q) => q.eq('conversationId', conversationId))
        .collect()
    : await ctx.db.query('videoJobs').collect()

  return jobs.filter((job) => activeJobStatuses.has(job.status))
}

async function failJobs(
  ctx: MutationCtx,
  jobs: Array<{
    _id: Id<'videoJobs'>
    assistantMessageId: Id<'messages'>
  }>,
  reason: string,
) {
  const now = Date.now()

  for (const job of jobs) {
    await ctx.db.patch(job._id, {
      status: 'failed',
      error: reason,
      updatedAt: now,
    })
    await ctx.db.patch(job.assistantMessageId, {
      body: `Failed to generate video: ${reason}`,
      status: 'error',
    })
  }
}

async function recoverStaleJobs(
  ctx: MutationCtx,
  jobs: Awaited<ReturnType<typeof listActiveJobs>>,
) {
  const now = Date.now()
  const staleJobs = jobs.filter((job) => now - job.updatedAt > ACTIVE_JOB_STALE_MS)

  if (staleJobs.length > 0) {
    await failJobs(
      ctx,
      staleJobs,
      'This job stopped reporting progress and was marked failed automatically.',
    )
  }

  return jobs.filter((job) => now - job.updatedAt <= ACTIVE_JOB_STALE_MS)
}

export const listConversations = query({
  args: {
    clientSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await listSessionConversations(ctx, args.clientSessionId)
  },
})

export const listConversationsWithStatus = query({
  args: {
    clientSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversations = await listSessionConversations(ctx, args.clientSessionId)

    const results = [] as Array<Doc<'conversations'> & { activeJobCount: number }>
    for (const conversation of conversations) {
      const jobs = await ctx.db
        .query('videoJobs')
        .withIndex('by_conversation', (q) => q.eq('conversationId', conversation._id))
        .collect()
      const activeJobCount = jobs.filter((job) => activeJobStatuses.has(job.status)).length
      results.push({ ...conversation, activeJobCount })
    }

    return results
  },
})

export const listMessages = query({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId))
      .collect()

    return messages.sort((left, right) => left.createdAt - right.createdAt)
  },
})

export const ensureConversation = mutation({
  args: {
    clientSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const current = (await listSessionConversations(ctx, args.clientSessionId))[0]
    if (current) {
      return current._id
    }

    return await createConversation(ctx, args.clientSessionId)
  },
})

export const createNewConversation = mutation({
  args: {
    clientSessionId: v.string(),
  },
  returns: v.id('conversations'),
  handler: async (ctx, args) => {
    return await createConversation(ctx, args.clientSessionId)
  },
})

export const listActiveJobsForConversation = internalQuery({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    return await listActiveJobs(ctx, args.conversationId)
  },
})

export const listAllVideoJobsForClientSession = internalQuery({
  args: {
    clientSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversations = await listSessionConversations(ctx, args.clientSessionId)
    const jobs: Array<Doc<'videoJobs'>> = []

    for (const conversation of conversations) {
      const batch = await ctx.db
        .query('videoJobs')
        .withIndex('by_conversation', (q) => q.eq('conversationId', conversation._id))
        .collect()
      jobs.push(...batch)
    }

    return jobs
  },
})

export const createVideoRequest = internalMutation({
  args: {
    conversationId: v.id('conversations'),
    prompt: v.string(),
  },
  returns: v.object({
    jobId: v.id('videoJobs'),
    assistantMessageId: v.id('messages'),
    userMessageId: v.id('messages'),
  }),
  handler: async (ctx, args) => {
    const prompt = trimPrompt(args.prompt)
    if (!prompt) {
      throw new Error('Prompt is required')
    }

    const conversation = await ctx.db.get(args.conversationId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    await recoverStaleJobs(
      ctx,
      await listActiveJobs(ctx, args.conversationId),
    )

    const now = Date.now()
    const userMessageId = await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      role: 'user',
      body: prompt,
      status: 'complete',
      createdAt: now,
    })

    const assistantMessageId = await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      role: 'assistant',
      body: 'Starting sandbox...',
      status: 'pending',
      createdAt: now + 1,
    })

    const jobId = await ctx.db.insert('videoJobs', {
      conversationId: args.conversationId,
      userMessageId,
      assistantMessageId,
      prompt,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.patch(assistantMessageId, { jobId })
    await ctx.db.patch(conversation._id, {
      title:
        conversation.title === DEFAULT_CONVERSATION_TITLE
          ? titleFromPrompt(prompt)
          : conversation.title,
      updatedAt: now,
    })

    return {
      jobId,
      assistantMessageId,
      userMessageId,
    }
  },
})

export const listConversationJobs = internalQuery({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('videoJobs')
      .withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId))
      .collect()
  },
})

export const deleteConversationInternal = internalMutation({
  args: {
    conversationId: v.id('conversations'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)
    if (!conversation) {
      return null
    }

    const jobs = await ctx.db
      .query('videoJobs')
      .withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId))
      .collect()
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId))
      .collect()

    for (const job of jobs) {
      await ctx.db.delete(job._id)
    }
    for (const message of messages) {
      await ctx.db.delete(message._id)
    }
    await ctx.db.delete(conversation._id)
    return null
  },
})

export const hardResetClientSession = internalMutation({
  args: {
    clientSessionId: v.string(),
  },
  returns: v.id('conversations'),
  handler: async (ctx, args) => {
    const conversations = await listSessionConversations(ctx, args.clientSessionId)

    for (const conversation of conversations) {
      const jobs = await ctx.db
        .query('videoJobs')
        .withIndex('by_conversation', (q) => q.eq('conversationId', conversation._id))
        .collect()
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_conversation', (q) => q.eq('conversationId', conversation._id))
        .collect()

      for (const job of jobs) {
        await ctx.db.delete(job._id)
      }

      for (const message of messages) {
        await ctx.db.delete(message._id)
      }

      await ctx.db.delete(conversation._id)
    }

    return await createConversation(ctx, args.clientSessionId)
  },
})

export const getJob = internalQuery({
  args: {
    jobId: v.id('videoJobs'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId)
  },
})

export const findJobByMuxAssetId = internalQuery({
  args: {
    muxAssetId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('videoJobs')
      .withIndex('by_mux_asset_id', (q) => q.eq('muxAssetId', args.muxAssetId))
      .unique()
  },
})

export const updateJob = internalMutation({
  args: {
    jobId: v.id('videoJobs'),
    status: v.optional(
      v.union(
        v.literal('queued'),
        v.literal('sandbox_starting'),
        v.literal('agent_running'),
        v.literal('render_complete'),
        v.literal('uploading_to_mux'),
        v.literal('mux_processing'),
        v.literal('ready'),
        v.literal('failed'),
      ),
    ),
    sandboxId: v.optional(v.string()),
    sandboxName: v.optional(v.string()),
    opencodeSessionId: v.optional(v.string()),
    resultPath: v.optional(v.string()),
    muxUploadId: v.optional(v.string()),
    muxAssetId: v.optional(v.string()),
    muxPlaybackId: v.optional(v.string()),
    videoId: v.optional(v.id('videos')),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(
      args.jobId,
      omitUndefined({
        status: args.status,
        sandboxId: args.sandboxId,
        sandboxName: args.sandboxName,
        opencodeSessionId: args.opencodeSessionId,
        resultPath: args.resultPath,
        muxUploadId: args.muxUploadId,
        muxAssetId: args.muxAssetId,
        muxPlaybackId: args.muxPlaybackId,
        videoId: args.videoId,
        error: args.error,
        updatedAt: Date.now(),
      }),
    )
  },
})

export const updateAssistantMessage = internalMutation({
  args: {
    messageId: v.id('messages'),
    body: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('complete'),
      v.literal('error'),
    ),
    videoId: v.optional(v.id('videos')),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(
      args.messageId,
      omitUndefined({
        body: args.body,
        status: args.status,
        videoId: args.videoId,
      }),
    )
  },
})

export const failJob = internalMutation({
  args: {
    jobId: v.id('videoJobs'),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)
    if (!job) {
      return
    }

    await ctx.db.patch(job._id, {
      status: 'failed',
      error: args.error,
      updatedAt: Date.now(),
    })
    await ctx.db.patch(job.assistantMessageId, {
      body: `Failed to generate video: ${args.error}`,
      status: 'error',
    })
  },
})

export const completeJob = internalMutation({
  args: {
    jobId: v.id('videoJobs'),
    muxAssetId: v.string(),
    muxPlaybackId: v.string(),
    videoId: v.id('videos'),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)
    if (!job) {
      return
    }

    await ctx.db.patch(job._id, {
      status: 'ready',
      muxAssetId: args.muxAssetId,
      muxPlaybackId: args.muxPlaybackId,
      videoId: args.videoId,
      updatedAt: Date.now(),
    })
    await ctx.db.patch(job.assistantMessageId, {
      body: 'Sure! Check the video here.',
      status: 'complete',
      videoId: args.videoId,
    })
  },
})
