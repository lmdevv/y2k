import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  conversations: defineTable({
    clientSessionId: v.string(),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_client_session', ['clientSessionId']),
  messages: defineTable({
    conversationId: v.id('conversations'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    body: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('complete'),
      v.literal('error'),
    ),
    jobId: v.optional(v.id('videoJobs')),
    videoId: v.optional(v.id('videos')),
    createdAt: v.number(),
  }).index('by_conversation', ['conversationId', 'createdAt']),
  products: defineTable({
    title: v.string(),
    imageId: v.string(),
    price: v.number(),
  }),
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
  videos: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    muxPlaybackId: v.string(),
    durationSeconds: v.optional(v.number()),
    conversationId: v.optional(v.id('conversations')),
    jobId: v.optional(v.id('videoJobs')),
  }).index('by_playback_id', ['muxPlaybackId']),
  videoJobs: defineTable({
    conversationId: v.id('conversations'),
    userMessageId: v.id('messages'),
    assistantMessageId: v.id('messages'),
    prompt: v.string(),
    status: v.union(
      v.literal('queued'),
      v.literal('sandbox_starting'),
      v.literal('agent_running'),
      v.literal('render_complete'),
      v.literal('uploading_to_mux'),
      v.literal('mux_processing'),
      v.literal('ready'),
      v.literal('failed'),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_status', ['status'])
    .index('by_mux_asset_id', ['muxAssetId'])
    .index('by_mux_upload_id', ['muxUploadId'])
    .index('by_conversation', ['conversationId', 'createdAt']),
})
