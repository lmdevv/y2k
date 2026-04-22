import { httpRouter } from 'convex/server'
import { muxWebhook } from './mux'

const http = httpRouter()

http.route({
  path: '/mux/webhook',
  method: 'POST',
  handler: muxWebhook,
})

export default http
