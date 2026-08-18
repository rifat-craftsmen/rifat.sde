import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../../src/app.js'
import { signedInteraction } from './setup/sign.js'
import { discordInteraction } from '../helpers/fixtures.js'
import { resetTable, seedBaseWorld } from './setup/db.js'

// Full chain: express.raw → discordVerify (real Ed25519) → discordAuth (DB) →
// controller dispatch → service → DB. The body is sent as a STRING so supertest
// transmits the exact signed bytes (see setup/sign.ts).
beforeEach(async () => {
  await resetTable()
  await seedBaseWorld()
})

describe('e2e — POST /discord/interactions (signed)', () => {
  it('happy path: /my-schedule for a seeded ACTIVE user returns the schedule', async () => {
    const body = discordInteraction('my-schedule', { memberUserId: 'employee-1' })
    const { body: raw, headers } = signedInteraction(body)
    const res = await request(app).post('/discord/interactions').set(headers).send(raw)
    expect(res.status).toBe(200)
    expect(res.body.type).toBe(4)
    expect(res.body.data.content).toContain('Meal Schedule')
  })

  it('rejects a request with a bad signature (401)', async () => {
    const body = discordInteraction('my-schedule', { memberUserId: 'employee-1' })
    const { body: raw } = signedInteraction(body)
    const res = await request(app)
      .post('/discord/interactions')
      .set({
        'x-signature-ed25519': '00'.repeat(64), // bogus
        'x-signature-timestamp': '1700000000',
        'content-type': 'application/json',
      })
      .send(raw)
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/signature/i)
  })

  it('returns an ephemeral "not registered" message for an unknown user', async () => {
    const body = discordInteraction('my-schedule', { memberUserId: 'ghost-999' })
    const { body: raw, headers } = signedInteraction(body)
    const res = await request(app).post('/discord/interactions').set(headers).send(raw)
    expect(res.status).toBe(200) // Discord-style: JSON 200 with ephemeral content
    expect(res.body.data.content).toMatch(/not registered/i)
  })

  it('RBAC: a non-ADMIN calling /create-schedule is denied', async () => {
    const body = discordInteraction('create-schedule', { memberUserId: 'employee-1' })
    const { body: raw, headers } = signedInteraction(body)
    const res = await request(app).post('/discord/interactions').set(headers).send(raw)
    expect(res.status).toBe(200)
    expect(res.body.data.content).toMatch(/only admins/i)
  })
})
