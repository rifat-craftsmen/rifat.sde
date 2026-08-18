import serverlessExpress from '@vendia/serverless-express'
import { app } from './app.js'

const _handler = serverlessExpress({ app })

export const handler = (event: any, context: any, callback: any) => {
  console.log('[googleLambda] event:', JSON.stringify({
    path:   event.rawPath ?? event.path,
    method: event.requestContext?.http?.method ?? event.httpMethod,
  }))
  return _handler(event, context, callback)
}
