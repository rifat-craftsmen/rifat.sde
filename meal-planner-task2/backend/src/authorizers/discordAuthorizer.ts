import 'dotenv/config'
import { verifyKey } from 'discord-interactions'

interface APIGatewayAuthorizerEvent {
  headers:        Record<string, string>
  body?:          string
  methodArn:      string
  requestContext: { accountId: string }
}

function buildPolicy(effect: 'Allow' | 'Deny', methodArn: string) {
  return {
    principalId: 'discord',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{ Action: 'execute-api:Invoke', Effect: effect, Resource: methodArn }],
    },
  }
}

/**
 * Lambda Authorizer for the Discord interactions route.
 * Runs before the main Discord Lambda via API Gateway Lambda Authorizer.
 *
 * - Verifies the Ed25519 signature using DISCORD_PUBLIC_KEY env var.
 * - Handles PING (type=1): returns { type: 1 } directly so Discord's
 *   endpoint verification succeeds within the 3-second window.
 * - Returns IAM allow policy on success, throws 'Unauthorized' on failure.
 * - Cache TTL = 0 — every Discord request has a unique signature.
 */
export const handler = async (event: APIGatewayAuthorizerEvent) => {
  const signature = event.headers['x-signature-ed25519']
  const timestamp = event.headers['x-signature-timestamp']
  const body      = event.body ?? ''
  const publicKey = process.env.DISCORD_PUBLIC_KEY ?? ''

  if (!signature || !timestamp) {
    throw new Error('Unauthorized')
  }

  const isValid = verifyKey(Buffer.from(body), signature, timestamp, publicKey)
  if (!isValid) {
    throw new Error('Unauthorized')
  }

  // Handle Discord PING — return type:1 response directly
  try {
    const parsed = JSON.parse(body)
    if (parsed.type === 1) {
      return { type: 1 }
    }
  } catch {
    // not JSON or not a PING — continue to allow
  }

  return buildPolicy('Allow', event.methodArn)
}
