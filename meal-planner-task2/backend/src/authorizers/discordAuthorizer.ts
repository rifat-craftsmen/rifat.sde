// HTTP API Gateway v2 REQUEST authorizer (simple responses format).
// Full Ed25519 signature verification requires the request body, which
// authorizers don't receive — that stays in discordVerify middleware.
// This layer only gates on header presence so bodyless requests are
// rejected before the main Lambda is invoked.

interface DiscordAuthorizerEvent {
  headers: Record<string, string>
}

export const handler = async (event: DiscordAuthorizerEvent) => {
  const signature = event.headers['x-signature-ed25519']
  const timestamp = event.headers['x-signature-timestamp']

  return { isAuthorized: !!(signature && timestamp) }
}
