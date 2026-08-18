import 'dotenv/config'
import { OAuth2Client } from 'google-auth-library'

interface APIGatewayAuthorizerEvent {
  headers:        Record<string, string>
  routeArn?:      string
  methodArn?:     string
  requestContext: { accountId: string }
}

const client = new OAuth2Client()

function buildPolicy(effect: 'Allow' | 'Deny', methodArn: string) {
  return {
    principalId: 'google-chat',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{ Action: 'execute-api:Invoke', Effect: effect, Resource: methodArn }],
    },
  }
}

/**
 * Lambda Authorizer for the Google Chat interactions route.
 * Runs before the main Google Chat Lambda via API Gateway Lambda Authorizer.
 *
 * - Extracts the Bearer JWT from the Authorization header.
 * - Verifies the JWT using google-auth-library against Google's public certs.
 * - Checks the token audience matches GOOGLE_CHAT_APP_ID env var.
 * - Returns IAM allow policy on success, throws 'Unauthorized' on failure.
 * - Cache TTL = 0 — Google Chat JWTs are per-request and short-lived.
 */
export const handler = async (event: APIGatewayAuthorizerEvent) => {
  const authHeader = event.headers['authorization'] ?? event.headers['Authorization'] ?? ''
  const token      = authHeader.replace(/^Bearer\s+/i, '')
  const appId      = process.env.GOOGLE_CHAT_APP_ID ?? ''

  if (!token) {
    throw new Error('Unauthorized')
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken:  token,
      audience: appId,
    })

    const payload = ticket.getPayload()
    if (!payload) {
      throw new Error('Unauthorized')
    }

    return buildPolicy('Allow', event.routeArn ?? event.methodArn ?? '*')
  } catch {
    throw new Error('Unauthorized')
  }
}
