import serverlessExpress from '@vendia/serverless-express'
import { app } from './app.js'

const _handler = serverlessExpress({ app })

export const handler = (event: any, context: any, callback: any) => {
  console.log('[lambda] event:', JSON.stringify({
    path: event.rawPath ?? event.path,
    method: event.requestContext?.http?.method ?? event.httpMethod,
    isBase64Encoded: event.isBase64Encoded,
    bodyLength: event.body?.length,
    bodyStart: event.body?.slice(0, 60),
    sigHeader: event.headers?.['x-signature-ed25519']?.slice(0, 16),
    tsHeader: event.headers?.['x-signature-timestamp'],
  }))
  return _handler(event, context, callback)
}
