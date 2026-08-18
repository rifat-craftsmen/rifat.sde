import { describe, it, expect, beforeEach } from 'vitest'
import { scriptDynamo, resetDynamo } from '../helpers/dynamoMock.js'
import { makeUser, makeRecord, makeSchedule } from '../helpers/fixtures.js'
import { getHeadcount, formatHeadcountMessage } from '../../src/services/headcountService.js'

const TABLE = 'trainee-2026-rifat-mhp-v2'

beforeEach(() => {
  resetDynamo()
})

/** Script getHeadcount's reads: active-user GSI query, schedule get, and the record batch. */
function script({ users, records, schedule }: { users: any[]; records: any[]; schedule?: any }) {
  scriptDynamo({
    query: [users], // entries are the raw Items arrays (FIFO; one QueryCommand here)
    get: schedule ? { [JSON.stringify({ PK: 'SCHEDULE', SK: '2026-06-20' })]: schedule } : {},
    batchGet: { [JSON.stringify([TABLE])]: records },
  })
}

describe('getHeadcount — aggregation logic', () => {
  it('sums per-meal booleans, splits work location, and breaks down by team', async () => {
    script({
      users: [
        makeUser({ discordId: 'a', teamId: 'team-alpha', teamName: 'Alpha' }),
        makeUser({ discordId: 'b', teamId: 'team-alpha', teamName: 'Alpha' }),
        makeUser({ discordId: 'c', teamId: 'team-beta', teamName: 'Beta' }),
      ],
      records: [
        makeRecord({ discordId: 'a', date: '2026-06-20', lunch: true, snacks: true, workFromHome: false, teamId: 'team-alpha', teamName: 'Alpha' }),
        makeRecord({ discordId: 'b', date: '2026-06-20', lunch: true, snacks: null, workFromHome: true, teamId: 'team-alpha', teamName: 'Alpha' }),
        makeRecord({ discordId: 'c', date: '2026-06-20', lunch: false, iftar: true, workFromHome: false, teamId: 'team-beta', teamName: 'Beta' }),
      ],
    })
    const data = await getHeadcount('2026-06-20')

    expect(data.overallTotal).toBe(3)
    expect(data.mealTotals).toEqual({ lunch: 2, snacks: 1, iftar: 1, eventDinner: 0, optionalDinner: 0 })
    expect(data.workLocationSplit).toEqual({ office: 2, wfh: 1 })

    const alpha = data.teamBreakdown.find(t => t.teamId === 'team-alpha')!
    expect(alpha.totalMembers).toBe(2)
    expect(alpha.lunch).toBe(2)
    expect(alpha.snacks).toBe(1)
    const beta = data.teamBreakdown.find(t => t.teamId === 'team-beta')!
    expect(beta.iftar).toBe(1)
    expect(data.teamBreakdown.map(t => t.teamName)).toEqual(['Alpha', 'Beta']) // sorted
  })

  it('excludes records without a teamId from the breakdown (but counts them in totals)', async () => {
    script({
      users: [makeUser({ discordId: 'x', teamId: undefined, teamName: undefined })],
      records: [makeRecord({ discordId: 'x', date: '2026-06-20', lunch: true, teamId: undefined, teamName: undefined })],
    })
    const data = await getHeadcount('2026-06-20')
    expect(data.overallTotal).toBe(1)
    expect(data.mealTotals.lunch).toBe(1)
    expect(data.teamBreakdown).toEqual([]) // __none__ filtered out
  })

  it('returns empty totals when there are no records', async () => {
    script({ users: [makeUser({ discordId: 'a' })], records: [] })
    const data = await getHeadcount('2026-06-20')
    expect(data.overallTotal).toBe(0)
    expect(data.mealTotals).toEqual({ lunch: 0, snacks: 0, iftar: 0, eventDinner: 0, optionalDinner: 0 })
    expect(data.workLocationSplit).toEqual({ office: 0, wfh: 0 })
  })

  it('attaches occasionName from the published schedule', async () => {
    script({
      users: [makeUser({ discordId: 'a' })],
      records: [makeRecord({ discordId: 'a', date: '2026-06-20', lunch: true })],
      schedule: makeSchedule('2026-06-20', { occasionName: 'Eid Dinner' }),
    })
    const data = await getHeadcount('2026-06-20')
    expect(data.occasionName).toBe('Eid Dinner')
  })
})

describe('formatHeadcountMessage — pure formatting', () => {
  it('returns null when overallTotal is 0', () => {
    expect(formatHeadcountMessage({
      date: '2026-06-20',
      mealTotals: { lunch: 0, snacks: 0, iftar: 0, eventDinner: 0, optionalDinner: 0 },
      teamBreakdown: [],
      workLocationSplit: { office: 0, wfh: 0 },
      overallTotal: 0,
    })).toBeNull()
  })

  it('renders a non-empty report string with date + meal lines, omitting zero meals', () => {
    const msg = formatHeadcountMessage({
      date: '2026-06-20',
      mealTotals: { lunch: 3, snacks: 0, iftar: 1, eventDinner: 0, optionalDinner: 0 },
      teamBreakdown: [],
      workLocationSplit: { office: 2, wfh: 1 },
      overallTotal: 3,
    })!
    expect(msg).toContain('2026-06-20')
    expect(msg).toContain('Lunch: **3**')
    expect(msg).not.toContain('Snacks') // 0 → omitted
    expect(msg).toContain('Office: **2**')
    expect(msg).toContain('WFH: **1**')
  })
})
