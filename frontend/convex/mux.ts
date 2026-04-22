import Mux from '@mux/mux-node'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'

function getMuxTokenSecret() {
  return process.env.MUX_TOKEN_SECRET ?? process.env.MUX_SECRET_KEY
}

export function createMuxClient() {
  const tokenId = process.env.MUX_TOKEN_ID
  const tokenSecret = getMuxTokenSecret()

  if (!tokenId || !tokenSecret) {
    throw new Error('Missing required Mux credentials')
  }

  return new Mux({ tokenId, tokenSecret })
}

export async function uploadVideoBuffer(options: {
  data: Buffer
  jobId: string
}) {
  const mux = createMuxClient()
  const upload = await mux.video.uploads.create({
    cors_origin: '*',
    new_asset_settings: {
      playback_policy: ['public'],
      video_quality: 'basic',
      passthrough: options.jobId,
    },
  })

  if (!upload.url) {
    throw new Error('Mux did not return an upload URL')
  }

  const response = await fetch(upload.url, {
    method: 'PUT',
    body: new Uint8Array(options.data),
    headers: {
      'content-type': 'video/mp4',
    },
  })

  if (!response.ok) {
    throw new Error(`Mux upload failed with status ${response.status}`)
  }

  return upload
}

function eventAssetId(event: any) {
  return event?.data?.id ?? event?.data?.asset_id ?? event?.object?.id
}

function eventPlaybackId(event: any) {
  return event?.data?.playback_ids?.[0]?.id
}

function eventPassthrough(event: any) {
  return event?.data?.passthrough
}

export const muxWebhook = httpAction(async (ctx, request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signingSecret = process.env.MUX_WEBHOOK_SIGNING_SECRET
  if (!signingSecret) {
    return new Response('Missing MUX_WEBHOOK_SIGNING_SECRET', { status: 500 })
  }

  const body = await request.text()
  let event: any

  try {
    event = createMuxClient().webhooks.unwrap(body, request.headers, signingSecret)
  } catch {
    return new Response('Invalid signature', { status: 401 })
  }

  if (event.type === 'video.upload.asset_created') {
    const jobId = eventPassthrough(event)
    const muxAssetId = eventAssetId(event)
    if (jobId && muxAssetId) {
      await ctx.runMutation(internal.chat.updateJob, {
        jobId,
        muxAssetId,
        status: 'mux_processing',
      })
    }
  }

  if (event.type === 'video.asset.ready') {
    const muxAssetId = eventAssetId(event)
    const muxPlaybackId = eventPlaybackId(event)
    if (muxAssetId && muxPlaybackId) {
      let job = null
      const jobId = eventPassthrough(event)
      if (jobId) {
        job = await ctx.runQuery(internal.chat.getJob, { jobId })
      }
      if (!job) {
        job = await ctx.runQuery(internal.chat.findJobByMuxAssetId, { muxAssetId })
      }

      if (job) {
        const videoId = await ctx.runMutation(internal.videos.createGenerated, {
          title: titleFromResult(job.prompt),
          description: job.prompt,
          muxPlaybackId,
          durationSeconds:
            typeof event?.data?.duration === 'number' ? event.data.duration : undefined,
          conversationId: job.conversationId,
          jobId: job._id,
        })

        await ctx.runMutation(internal.chat.completeJob, {
          jobId: job._id,
          muxAssetId,
          muxPlaybackId,
          videoId,
        })
      }
    }
  }

  if (event.type === 'video.asset.errored') {
    const muxAssetId = eventAssetId(event)
    if (muxAssetId) {
      const job = await ctx.runQuery(internal.chat.findJobByMuxAssetId, { muxAssetId })
      if (job) {
        await ctx.runMutation(internal.chat.failJob, {
          jobId: job._id,
          error: 'Mux could not process the uploaded video.',
        })
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  })
})

function titleFromResult(prompt: string) {
  return prompt.length > 60 ? `${prompt.slice(0, 57)}...` : prompt
}
