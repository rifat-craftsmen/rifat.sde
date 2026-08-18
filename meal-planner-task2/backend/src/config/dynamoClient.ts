import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const clientConfig = process.env.DYNAMODB_ENDPOINT
  ? { region: process.env.AWS_REGION || 'ap-southeast-1', endpoint: process.env.DYNAMODB_ENDPOINT }
  : { region: process.env.AWS_REGION || 'ap-southeast-1' }

const raw = new DynamoDBClient(clientConfig)

export const dynamo = DynamoDBDocumentClient.from(raw, {
  marshallOptions: { removeUndefinedValues: true },
})

export const TABLES = {
  MAIN: process.env.DYNAMODB_TABLE_MAIN || 'trainee-2026-rifat-mhp-v2',
} as const
