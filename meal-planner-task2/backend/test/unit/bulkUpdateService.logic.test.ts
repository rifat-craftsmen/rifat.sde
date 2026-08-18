import { describe, it, expect, beforeEach } from 'vitest'
import { scriptDynamo, resetDynamo, findAllSent } from '../helpers/dynamoMock.js'
import { makeUser, makeSchedule } from '../helpers/fixtures.js'
import { applyBulkAction } from '../../src/services/bulkUpdateService.js'

const DATE = '2026-06-20'

beforeEach(() => {
  resetDynamo()
})

/** Run applyBulkAction for `members`, scripting their profiles + optional schedule. */
async function apply(
  members: string[],
  action: any,
  opts: { schedule?: any; profiles?: Record<string, any> } = {},
) {
  const gets: Record<string, any> = {}
  if (opts.schedule) {
    gets[JSON.stringify({ PK: 'SCHEDULE', SK: DATE })] = opts.schedule
  }
  for (const [id, profile] of Object.entries(opts.profiles ?? {})) {
    gets[JSON.stringify({ PK: `USER#${id}`, SK: 'PROFILE' })] = profile
  }
  scriptDynamo({ get: gets })
  return applyBulkAction(members, DATE, action, 'actor-1')
}

/** Find the meal-record PutCommand Item written for a member (excludes audit Puts). */
function recordPutForMember(memberId: string): any {
  return findAllSent('PutCommand')
    .map(p => p.input.Item)
    .find((item: any) => item?.PK === `USER#${memberId}` && item?.SK === `RECORD#${DATE}`)
}

/** Did applyBulkAction fetch the schedule? */
function fetchedSchedule(): boolean {
  return findAllSent('GetCommand').some(g => g.input.Key?.PK === 'SCHEDULE')
}

describe('applyBulkAction — buildMealData mapping + schedule-fetch gating', () => {
  it('WFH_ON: opts out of enabled meals (false), nulls disabled meals, sets WFH=true', async () => {
    const schedule = makeSchedule(DATE, { lunchEnabled: true, snacksEnabled: true, iftarEnabled: false })
    const count = await apply(['m1'], 'WFH_ON', {
      schedule,
      profiles: { m1: makeUser({ discordId: 'm1' }) },
    })
    expect(count).toBe(1)
    const item = recordPutForMember('m1')!
    expect(item.workFromHome).toBe(true)
    expect(item.lunch).toBe(false)   // enabled → false (opt out)
    expect(item.snacks).toBe(false)  // enabled → false
    expect(item.iftar).toBe(null)    // disabled → null
  })

  it('WFH_OFF: clears only WFH; no schedule fetched; meal fields left untouched', async () => {
    const count = await apply(['m1'], 'WFH_OFF', {
      profiles: { m1: makeUser({ discordId: 'm1' }) },
    })
    expect(count).toBe(1)
    expect(fetchedSchedule()).toBe(false)
    const item = recordPutForMember('m1')!
    expect(item.workFromHome).toBe(false)
    expect(item.lunch).toBe(null) // new record, omitted meals → null
  })

  it('SET_AVAILABLE_MEALS: opts into enabled meals (true), nulls disabled, clears WFH', async () => {
    const schedule = makeSchedule(DATE, { lunchEnabled: true, snacksEnabled: false })
    await apply(['m1'], 'SET_AVAILABLE_MEALS', {
      schedule,
      profiles: { m1: makeUser({ discordId: 'm1' }) },
    })
    const item = recordPutForMember('m1')!
    expect(item.workFromHome).toBe(false)
    expect(item.lunch).toBe(true)   // enabled → true
    expect(item.snacks).toBe(null)  // disabled → null
  })

  it('UNSET_AVAILABLE_MEALS: opts out of enabled meals, nulls disabled', async () => {
    const schedule = makeSchedule(DATE, { lunchEnabled: true })
    await apply(['m1'], 'UNSET_AVAILABLE_MEALS', {
      schedule,
      profiles: { m1: makeUser({ discordId: 'm1' }) },
    })
    const item = recordPutForMember('m1')!
    expect(item.lunch).toBe(false)  // enabled → false
    expect(item.iftar).toBe(null)   // disabled → null
  })

  it('UNSET_ALL_MEALS: hard-sets all five meals false (no schedule fetch)', async () => {
    const count = await apply(['m1'], 'UNSET_ALL_MEALS', {
      profiles: { m1: makeUser({ discordId: 'm1' }) },
    })
    expect(count).toBe(1)
    expect(fetchedSchedule()).toBe(false)
    const item = recordPutForMember('m1')!
    expect(item.lunch).toBe(false)
    expect(item.snacks).toBe(false)
    expect(item.iftar).toBe(false)
    expect(item.eventDinner).toBe(false)
    expect(item.optionalDinner).toBe(false)
  })

  it('skips members whose profile is missing (count reflects successes only)', async () => {
    const count = await apply(['good', 'missing'], 'WFH_OFF', {
      profiles: { good: makeUser({ discordId: 'good' }) }, // 'missing' has no profile
    })
    expect(count).toBe(1)
  })
})
