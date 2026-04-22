import { internalMutation, query } from './_generated/server'
import { v } from 'convex/values'

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('videos').order('desc').collect()
  },
})

export const getById = query({
  args: { id: v.id('videos') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

const SEED_VIDEOS: Array<{
  title: string
  muxPlaybackId: string
  description?: string
}> = [
  {
    title: 'Charlie bit my finger! ORIGINAL',
    muxPlaybackId: 'CWQDyt3Eyw9zZ01BwWbv00VFIlNos9b8lgv7y3nhpMQ3M',
  },
  {
    title: 'Me at the zoo [jNQXAC9IVRw]',
    muxPlaybackId: 'jr5nNTG7IKR5Pd2yXLNYLLKlhhkVU9F9R1v00tv6b1lM',
  },
  {
    title: '2004： Janet Jackson Wardrobe Malfunction [rw9wJqYy7M8]',
    muxPlaybackId: 'aFkMSXhKqIU025iRaEYrFslEXdMkkRY87G3EzFzGG7ec',
  },
  {
    title:
      "Limits, L'Hôpital's rule, and epsilon delta definitions ｜ Chapter 7, Essence of calculus [kfF40MiS7zA]",
    muxPlaybackId: 'R2JrznUFEFGuUJBkuVUIu00t36CkpH4XDopuuPwAEiS4',
  },
  {
    title: 'Higher order derivatives ｜ Chapter 10, Essence of calculus [BLkz5LGWihw]',
    muxPlaybackId: 'bFxsD3ih01jvM27Jx00lPmvAZbNVV1VajNDGAKngBMTNE',
  },
  {
    title: 'Taylor series ｜ Chapter 11, Essence of calculus [3d6DsjIBzJ4]',
    muxPlaybackId: 'iG0102StNTi3pNgYAeq02v2ndwCNiPR7ysl15F02ibHE85c',
  },
  {
    title: 'Derivative formulas through geometry ｜ Chapter 3, Essence of calculus [S0_qX4VJhMQ]',
    muxPlaybackId: '77rZT902js01HI2zdsYZyW8e95h2KjljzwB4qmSJApJT4',
  },
  {
    title:
      "Implicit differentiation, what's going on here？ ｜ Chapter 6, Essence of calculus [qb40J4N1fa4]",
    muxPlaybackId: 'iGINfx9sLBAOfB02GGntSIzJHCsT5LIlOkYWHsJEFe9g',
  },
  {
    title: 'Integration and the fundamental theorem of calculus ｜ Chapter 8, Essence of calculus [rfG8ce4nNh0]',
    muxPlaybackId: 'nA00SLXLMvzzorfbBGu00np8Uj7hH8Vm3EXGjh6aAA5mk',
  },
  {
    title: 'The essence of calculus [WUvTyaaNkzM]',
    muxPlaybackId: 'AaivTjHNxN9SrmesFtYidux00ksWdDxPkBufC02Hxbgjw',
  },
]

const DEPRECATED_PLAYBACK_IDS = [
  'PPdKq401Byb5af6WTOt65Ncb500woqMnWbY01V3fKp4K4c',
]

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results: Array<{
      muxPlaybackId: string
      inserted: boolean
      id?: string
    }> = []

    for (const muxPlaybackId of DEPRECATED_PLAYBACK_IDS) {
      const existing = await ctx.db
        .query('videos')
        .withIndex('by_playback_id', (q) => q.eq('muxPlaybackId', muxPlaybackId))
        .unique()
      if (existing) {
        await ctx.db.delete(existing._id)
      }
    }

    for (const video of SEED_VIDEOS) {
      const existing = await ctx.db
        .query('videos')
        .withIndex('by_playback_id', (q) =>
          q.eq('muxPlaybackId', video.muxPlaybackId),
        )
        .unique()

      if (existing) {
        results.push({
          muxPlaybackId: video.muxPlaybackId,
          inserted: false,
          id: existing._id,
        })
        continue
      }

      const id = await ctx.db.insert('videos', {
        title: video.title,
        description: video.description,
        muxPlaybackId: video.muxPlaybackId,
      })

      results.push({ muxPlaybackId: video.muxPlaybackId, inserted: true, id })
    }

    return results
  },
})

