import { describe, it, expect, beforeEach, vi } from 'vitest'
import nacl from 'tweetnacl'
import type { Response, NextFunction, Request } from 'express'

// Real Ed25519 verification lives in discordVerify via discord-interactions.
// We generate a throwaway keypair and set process.env.DISCORD_PUBLIC_KEY so the
// middleware accepts our signatures. This exercises the actual crypto path.
const keypair = nacl.sign.keyPair()
const PUBLIC_KEY_HEX = Buffer.from(keypair.publicKey).toString('hex')
const SECRET_KEY = keypair.secretKey

function sign(bodyObj: any, timestamp = '1700000000') {
  const raw = Buffer.from(JSON.stringify(bodyObj), 'utf8')
  const message = Buffer.concat([Buffer.from(timestamp, 'utf8'), raw])
  const sig = nacl.sign.detached(new Uint8Array(message), SECRET_KEY)
  return { raw, signature: Buffer.from(sig).toString('hex'), timestamp }
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this },
    json(payload: any) { this.body = payload; return this },
    end() { return this },
  }
  return res as unknown as Response
}

describe('discordVerify middleware', () => {
  beforeEach(() => {
    process.env.DISCORD_PUBLIC_KEY = PUBLIC_KEY_HEX
  })

  it('answers PING (type 1) with { type: 1 } and does not call next', async () => {
    const { discordVerify } = await import('../../src/middleware/discordVerify.js')
    const { raw, signature, timestamp } = sign({ type: 1 })
    const req = {
      headers: { 'x-signature-ed25519': signature, 'x-signature-timestamp': timestamp },
      body: raw,
    } as any
    const res = mockRes()
    const next = vi.fn()
    discordVerify(req as Request, res, next as NextFunction)
    expect((res as any).body).toEqual({ type: 1 })
    expect(next).not.toHaveBeenCalled()
  })

  it('parses a valid type-2 interaction and calls next(), replacing req.body with the object', async () => {
    const { discordVerify } = await import('../../src/middleware/discordVerify.js')
    const interaction = { type: 2, data: { name: 'my-schedule' }, member: { user: { id: 'u1' } } }
    const { raw, signature, timestamp } = sign(interaction)
    const req = {
      headers: { 'x-signature-ed25519': signature, 'x-signature-timestamp': timestamp },
      body: raw,
    } as any
    const res = mockRes()
    const next = vi.fn()
    discordVerify(req as Request, res, next as NextFunction)
    expect(next).toHaveBeenCalledTimes(1)
    expect(req.body).toEqual(interaction) // body replaced with parsed JSON
  })

  it('rejects a tampered signature with 401', async () => {
    const { discordVerify } = await import('../../src/middleware/discordVerify.js')
    const interaction = { type: 2, data: { name: 'my-schedule' } }
    const { raw, timestamp } = sign(interaction)
    const req = {
      headers: { 'x-signature-ed25519': '00'.repeat(64), 'x-signature-timestamp': timestamp }, // bogus sig
      body: raw,
    } as any
    const res = mockRes()
    const next = vi.fn()
    discordVerify(req as Request, res, next as NextFunction)
    expect(res.statusCode).toBe(401)
    expect((res as any).body).toEqual({ error: 'Invalid request signature' })
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects a valid signature over a different body (tampering) with 401', async () => {
    const { discordVerify } = await import('../../src/middleware/discordVerify.js')
    // Sign one body, send another → signature won't match.
    const { signature, timestamp } = sign({ type: 2, data: { name: 'my-schedule' } })
    const tamperedRaw = Buffer.from(JSON.stringify({ type: 2, data: { name: 'headcount' } }), 'utf8')
    const req = {
      headers: { 'x-signature-ed25519': signature, 'x-signature-timestamp': timestamp },
      body: tamperedRaw,
    } as any
    const res = mockRes()
    discordVerify(req as Request, res, vi.fn())
    expect(res.statusCode).toBe(401)
  })

  it('returns 500 when DISCORD_PUBLIC_KEY is unset', async () => {
    const { discordVerify } = await import('../../src/middleware/discordVerify.js')
    delete process.env.DISCORD_PUBLIC_KEY
    const { raw, signature, timestamp } = sign({ type: 2 })
    const req = {
      headers: { 'x-signature-ed25519': signature, 'x-signature-timestamp': timestamp },
      body: raw,
    } as any
    const res = mockRes()
    discordVerify(req as Request, res, vi.fn())
    expect(res.statusCode).toBe(500)
    expect((res as any).body).toEqual({ error: 'Server misconfiguration' })
  })
})
