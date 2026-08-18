import serverlessExpress from '@vendia/serverless-express'
import { app } from './app.js'

const _handler = serverlessExpress({ app })

export const handler = (event: any, context: any, callback: any) => {
  // Ensure body is always a string for serverless-express body parsing
  if (event.body && event.isBase64Encoded) {
    event.body = Buffer.from(event.body, 'base64').toString('utf8')
    event.isBase64Encoded = false
  }
  return _handler(event, context, callback)
}
