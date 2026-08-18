import { config } from 'dotenv'
import nacl from 'tweetnacl'

// 1. Load test env (DYNAMODB_ENDPOINT=:8000) BEFORE any app import.
config({ path: '.env.test' })

// 2. Generate a throwaway Ed25519 keypair and expose its public key as
//    DISCORD_PUBLIC_KEY. discordVerify + discord-interactions will verify
//    requests signed with the matching private key (see ./sign.ts).
//    This runs in setupFiles, before the test files import the app.
const keypair = nacl.sign.keyPair()
process.env.DISCORD_PUBLIC_KEY = Buffer.from(keypair.publicKey).toString('hex')

// Stash the secret key on globalThis so sign.ts (loaded later) can read it.
;(globalThis as any).__TEST_SIGN_SECRET = Buffer.from(keypair.secretKey).toString('hex')
