import nacl from 'tweetnacl'

/** Secret key generated in setup/env.ts, shared via globalThis. */
function secretKey(): Uint8Array {
  const hex = (globalThis as any).__TEST_SIGN_SECRET as string
  if (!hex) throw new Error('Test signing key not initialised — setup/env.ts must run first')
  return new Uint8Array((hex.match(/.{1,2}/g) ?? []).map(b => parseInt(b, 16)))
}

/**
 * Produce a JSON body string + Ed25519 headers for a Discord interaction object,
 * matching the scheme discord-interactions.verifyKey expects:
 *   message = concat(utf8(timestamp), rawBody)
 *
 * Returns the body as a STRING so supertest transmits the exact bytes verbatim
 * (passing a Buffer with content-type application/json makes supertest
 * JSON-serialize it as {type:"Buffer",data:[...]}, which breaks verification).
 */
export function signedInteraction(body: object, timestamp = String(1700000000)): {
  body: string
  headers: Record<string, string>
} {
  const bodyStr = JSON.stringify(body)
  const raw = Buffer.from(bodyStr, 'utf8')
  const message = Buffer.concat([Buffer.from(timestamp, 'utf8'), raw])
  const sig = nacl.sign.detached(new Uint8Array(message), secretKey())
  return {
    body: bodyStr,
    headers: {
      'x-signature-ed25519': Buffer.from(sig).toString('hex'),
      'x-signature-timestamp': timestamp,
      'content-type': 'application/json',
    },
  }
}
