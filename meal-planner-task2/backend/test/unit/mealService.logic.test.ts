import { describe, it, expect, beforeEach } from 'vitest'
import { scriptDynamo, resetDynamo, findAllSent } from '../helpers/dynamoMock.js'
import { makeUser, makeRecord } from '../helpers/fixtures.js'
import { getCurrentMonthKey } from '../../src/utils/dateHelpers.js'
import { createOrUpdateMealRecord } from '../../src/services/mealService.js'

const ACTOR = 'actor-1'
const USER = 'u1'

/** Script profile + optional existing record, run, return the record PutCommand Item + updates. */
function run(data: any, opts: { profile?: any; existing?: any }) {
  const profile = opts.profile ?? makeUser({ discordId: USER, wfhCount: 2, wfhMonth: getCurrentMonthKey() })
  const gets: Record<string, any> = {
    [JSON.stringify({ PK: `USER#${USER}`, SK: 'PROFILE' })]: profile,
  }
  if (opts.existing !== undefined) {
    gets[JSON.stringify({ PK: `USER#${USER}`, SK: `RECORD#${data.date}` })] = opts.existing
  }
  scriptDynamo({ get: gets })
  return createOrUpdateMealRecord(USER, data, ACTOR).then(() => {
    const puts = findAllSent('PutCommand')
    return {
      recordItem: puts.find((p: any) => p.input.Item?.PK === `USER#${USER}`).input.Item,
      updates: findAllSent('UpdateCommand'),
    }
  })
}

beforeEach(() => {
  resetDynamo()
})

describe('createOrUpdateMealRecord — carry-forward logic', () => {
  it('carries forward stored meal fields when options are omitted (no WFH transition)', async () => {
    const existing = makeRecord({ discordId: USER, date: '2026-06-20', lunch: true, snacks: null, workFromHome: false })
    const { recordItem, updates } = await run(
      { date: '2026-06-20', workFromHome: false },
      { existing },
    )
    expect(recordItem.lunch).toBe(true)            // carried
    expect(recordItem.snacks).toBe(null)           // carried (was null)
    expect(recordItem.iftar).toBe(null)            // carried (undefined → null)
    expect(recordItem.workFromHome).toBe(false)
    expect(updates).toHaveLength(0)                // no WFH change → no counter update
  })

  it('on a WFH transition (false→true), unspecified meals reset to null', async () => {
    const existing = makeRecord({ discordId: USER, date: '2026-06-20', lunch: true, snacks: false, workFromHome: false })
    const { recordItem } = await run({ date: '2026-06-20', workFromHome: true }, { existing })
    expect(recordItem.workFromHome).toBe(true)
    expect(recordItem.lunch).toBe(null)   // was true → reset on transition
    expect(recordItem.snacks).toBe(null)  // was false → reset on transition
  })

  it('explicit options still take precedence during a transition', async () => {
    const existing = makeRecord({ discordId: USER, date: '2026-06-20', lunch: true, workFromHome: false })
    const { recordItem } = await run(
      { date: '2026-06-20', workFromHome: true, lunch: false },
      { existing },
    )
    expect(recordItem.workFromHome).toBe(true)
    expect(recordItem.lunch).toBe(false)  // explicit wins
  })
})

describe('createOrUpdateMealRecord — wfhCount counter', () => {
  it('office→WFH with no prior WFH increments by +1 (same month)', async () => {
    const { updates } = await run(
      { date: '2026-06-20', workFromHome: true },
      { existing: makeRecord({ discordId: USER, date: '2026-06-20', workFromHome: false }) },
    )
    expect(updates).toHaveLength(1)
    expect(updates[0].input.UpdateExpression).toMatch(/SET wfhCount = :count/)
    expect(updates[0].input.ExpressionAttributeValues[':count']).toBe(3) // 2 → 3
  })

  it('WFH→office decrements by -1, floored at 0', async () => {
    const { updates } = await run(
      { date: '2026-06-20', workFromHome: false },
      {
        profile: makeUser({ discordId: USER, wfhCount: 0, wfhMonth: getCurrentMonthKey() }),
        existing: makeRecord({ discordId: USER, date: '2026-06-20', workFromHome: true }),
      },
    )
    expect(updates[0].input.ExpressionAttributeValues[':count']).toBe(0) // max(0, 0 + -1)
  })

  it('no WFH change sends no counter Update', async () => {
    const { updates } = await run(
      { date: '2026-06-20', lunch: true, workFromHome: false },
      { existing: makeRecord({ discordId: USER, date: '2026-06-20', workFromHome: false }) },
    )
    expect(updates).toHaveLength(0)
  })

  it('month rollover resets the counter to the delta rather than adding', async () => {
    const { updates } = await run(
      { date: '2026-06-20', workFromHome: true },
      {
        profile: makeUser({ discordId: USER, wfhCount: 9, wfhMonth: '2020-01' }),
        existing: makeRecord({ discordId: USER, date: '2026-06-20', workFromHome: false }),
      },
    )
    expect(updates[0].input.UpdateExpression).toMatch(/SET wfhCount = :count, wfhMonth = :month/)
    expect(updates[0].input.ExpressionAttributeValues[':count']).toBe(1) // reset to delta
    expect(updates[0].input.ExpressionAttributeValues[':month']).toBe(getCurrentMonthKey())
  })

  it('throws when the user profile is missing', async () => {
    scriptDynamo({ get: {} }) // no profile
    await expect(createOrUpdateMealRecord(USER, { date: '2026-06-20', workFromHome: true }, ACTOR))
      .rejects.toThrow('User profile not found')
  })
})
