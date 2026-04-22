import { v } from 'convex/values'
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'

const DEFAULT_CONVERSATION_TITLE = 'Video Agent Chat'

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

export const listConversations = query({
  args: {
    clientSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query('conversations')
      .withIndex('by_client_session', (q) =>
        q.eq('clientSessionId', args.clientSessionId),
      )
      .collect()

    return conversations.sort((left, right) => right.updatedAt - left.updatedAt)
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
    const existing = await ctx.db
      .query('conversations')
      .withIndex('by_client_session', (q) =>
        q.eq('clientSessionId', args.clientSessionId),
      )
      .collect()

    const current = existing.sort((left, right) => right.updatedAt - left.updatedAt)[0]
    if (current) {
      return current._id
    }

    const now = Date.now()
    return await ctx.db.insert('conversations', {
      clientSessionId: args.clientSessionId,
      title: DEFAULT_CONVERSATION_TITLE,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const sendMessage = mutation({
  args: {
    conversationId: v.id('conversations'),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const prompt = trimPrompt(args.prompt)
    if (!prompt) {
      throw new Error('Prompt is required')
    }

    const activeJobs = (await ctx.db.query('videoJobs').collect()).filter((job) =>
      activeJobStatuses.has(job.status),
    )
    if (activeJobs.length > 0) {
      throw new Error('The video agent is already working on another request.')
    }

    const conversation = await ctx.db.get(args.conversationId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

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
      body: `/watch/${args.videoId}`,
      status: 'complete',
      videoId: args.videoId,
    })
  },
})
