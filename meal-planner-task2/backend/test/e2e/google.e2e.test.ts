import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../../src/app.js'
import { googleEvent } from '../helpers/fixtures.js'
import { resetTable, seedBaseWorld } from './setup/db.js'

// Google path: express.json → googleAuth (email → status-email-index GSI) →
// controller dispatch. googleRoutes converts the Discord {type:4,...} response
// into { text } transparently. No app-level signature (JWT authorizer is an
// API-Gateway concern, out of scope).
beforeEach(async () => {
  await resetTable()
  await seedBaseWorld()
})

describe('e2e — POST /google/interactions', () => {
  it('happy path: /my-schedule for a seeded ACTIVE user returns a text reply', async () => {
    const res = await request(app)
      .post('/google/interactions')
      .send(googleEvent('my-schedule', { email: 'employee@example.com' }))
    expect(res.status).toBe(200)
    expect(res.body.text).toContain('Meal Schedule')
  })

  it('returns a "not registered" text reply for an unknown email', async () => {
    const res = await request(app)
      .post('/google/interactions')
      .send(googleEvent('my-schedule', { email: 'ghost@example.com' }))
    expect(res.status).toBe(200)
    expect(res.body.text).toMatch(/not registered/i)
  })
})
