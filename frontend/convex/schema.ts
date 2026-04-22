import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
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
  }).index('by_playback_id', ['muxPlaybackId']),
})
