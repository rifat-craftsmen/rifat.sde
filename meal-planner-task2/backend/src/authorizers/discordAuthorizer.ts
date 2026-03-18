interface APIGatewayAuthorizerEvent {
  headers:   Record<string, string>
  routeArn?: string
  methodArn?: string
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
 *
 * Only checks that Discord signature headers are present — full Ed25519
 * verification happens in the main Discord Lambda (discordVerify middleware)
 * where the request body is available.
 */
export const handler = async (event: APIGatewayAuthorizerEvent) => {
  const signature = event.headers['x-signature-ed25519']
  const timestamp = event.headers['x-signature-timestamp']

  if (!signature || !timestamp) {
    throw new Error('Unauthorized')
  }

  return buildPolicy('Allow', event.routeArn ?? event.methodArn ?? '*')
}
