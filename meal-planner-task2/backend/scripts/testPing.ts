/**
 * Smoke test for the Discord interactions endpoint.
 *
 * Generates a throwaway Ed25519 keypair, signs a PING payload with it,
 * and verifies the server responds with { type: 1 }.
 *
 * Steps:
 *   1. Run this script once with --key to get the public key:
 *        npx tsx scripts/testPing.ts --key
 *
 *   2. Put that value in .env:
 *        DISCORD_PUBLIC_KEY=<printed hex>
 *
 *   3. Start the server:
 *        npm run dev
 *
 *   4. Run the test:
 *        npx tsx scripts/testPing.ts
 */
import { generateKeyPairSync, sign, createPrivateKey } from 'node:crypto'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const KEY_FILE  = join(__dirname, '.test-keypair.json')
const PORT      = process.env.PORT || '3000'
const URL       = `http://localhost:${PORT}/discord/interactions`

// ── Stable test keypair (written once, reused across runs) ───────────────────
function getTestKeyPair(): { privateKeyDer: string; publicKeyHex: string } {
  if (existsSync(KEY_FILE)) {
    return JSON.parse(readFileSync(KEY_FILE, 'utf8'))
  }
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const privateKeyDer = Buffer.from(privateKey.export({ type: 'pkcs8', format: 'der' })).toString('hex')
  // Raw 32-byte Ed25519 public key = last 32 bytes of SPKI DER blob
  const publicKeyHex  = Buffer.from(publicKey.export({ type: 'spki', format: 'der' })).subarray(-32).toString('hex')
  const pair = { privateKeyDer, publicKeyHex }
  writeFileSync(KEY_FILE, JSON.stringify(pair, null, 2))
  console.log(`Generated test keypair → ${KEY_FILE}`)
  return pair
}

// ── Sign a Discord interaction payload ───────────────────────────────────────
function signPayload(body: string, privateKeyDerHex: string): { timestamp: string; signature: string } {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const message   = Buffer.from(timestamp + body)
  const privKey   = createPrivateKey({ key: Buffer.from(privateKeyDerHex, 'hex'), format: 'der', type: 'pkcs8' })
  const signature = sign(null, message, privKey).toString('hex')
  return { timestamp, signature }
}

// ── Main ─────────────────────────────────────────────────────────────────────
const { privateKeyDer, publicKeyHex } = getTestKeyPair()

if (process.argv.includes('--key')) {
  console.log(publicKeyHex)
  process.exit(0)
}

console.log(`DISCORD_PUBLIC_KEY = ${publicKeyHex}\n`)

const body = JSON.stringify({ type: 1 })
const { timestamp, signature } = signPayload(body, privateKeyDer)

console.log(`POST ${URL}`)
const res = await fetch(URL, {
  method: 'POST',
  headers: {
    'Content-Type':          'application/json',
    'x-signature-ed25519':   signature,
    'x-signature-timestamp': timestamp,
  },
  body,
})

const json = await res.json()
console.log(`Status:   ${res.status}`)
console.log('Response:', JSON.stringify(json))

if (res.status === 200 && (json as { type: number }).type === 1) {
  console.log('\n✓ PING test passed')
} else {
  console.error('\n✗ PING test failed — expected 200 { type: 1 }')
  process.exit(1)
}
