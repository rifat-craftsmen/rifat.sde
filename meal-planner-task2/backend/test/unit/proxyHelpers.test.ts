import { describe, it, expect, beforeEach } from 'vitest'
import { scriptDynamo, resetDynamo } from '../helpers/dynamoMock.js'
import { makeUser } from '../helpers/fixtures.js'
import { resolveProxyTarget } from '../../src/commands/_proxyHelpers.js'

beforeEach(() => {
  resetDynamo()
})

describe('resolveProxyTarget', () => {
  it('Discord: reads the `user` option and returns it as targetId', async () => {
    const req = {
      user: { platform: 'discord' },
      body: { data: { options: [{ name: 'user', value: 'target-42' }] } },
    } as any
    const result = await resolveProxyTarget(req)
    expect(result).toEqual({ targetId: 'target-42', targetName: '<@target-42>' })
  })

  it('Discord: errors when no user option is provided', async () => {
    const req = { user: { platform: 'discord' }, body: { data: { options: [] } } } as any
    const result = await resolveProxyTarget(req)
    expect(result.targetId).toBeUndefined()
    expect(result.error).toMatch(/specify a team member/)
  })

  it('Google: looks up the @mentioned email and returns the profile discordId', async () => {
    const profile = makeUser({ discordId: 'samin', name: 'Samin Yasar', email: 'samin@example.com' })
    scriptDynamo({ query: [[profile]] }) // getUserByEmail → QueryCommand (entry = Items array)
    const req = {
      user: { platform: 'google' },
      body: {
        message: {
          argumentText: '@Samin Yasar 2026-06-20 lunch',
          annotations: [{ type: 'USER_MENTION', userMention: { user: { email: 'samin@example.com' } } }],
        },
      },
    } as any
    const result = await resolveProxyTarget(req)
    expect(result).toEqual({ targetId: 'samin', targetName: 'Samin Yasar' })
  })

  it('Google: errors when no USER_MENTION annotation is present', async () => {
    const req = { user: { platform: 'google' }, body: { message: { annotations: [] } } } as any
    const result = await resolveProxyTarget(req)
    expect(result.targetId).toBeUndefined()
    expect(result.error).toMatch(/@mention a team member/)
  })

  it('Google: errors when the mentioned email has no active profile', async () => {
    scriptDynamo({ query: [[]] }) // no profile
    const req = {
      user: { platform: 'google' },
      body: {
        message: {
          annotations: [{ type: 'USER_MENTION', userMention: { user: { email: 'ghost@example.com' } } }],
        },
      },
    } as any
    const result = await resolveProxyTarget(req)
    expect(result.targetId).toBeUndefined()
    expect(result.error).toMatch(/No active user found/)
  })
})
