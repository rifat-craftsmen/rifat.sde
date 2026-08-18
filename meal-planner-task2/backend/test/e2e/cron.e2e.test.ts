import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { handler as cronHandler } from '../../src/jobs/cronLambda.js'
import { getTomorrowString } from '../../src/utils/dateHelpers.js'
import { resetTable, seedBaseWorld, putItem, getItem } from './setup/db.js'

// CREATE_RECORDS orchestrates real DB writes over all active users
// (chunked BatchGet/Write, default-filling, global-WFH override). That
// multi-step wiring is not coverable by unit tests — hence e2e.
//
// Time is fixed to a Monday so today+1 is a Tuesday (both weekdays); otherwise
// the cron's weekend guard would skip and the test would be flaky.

beforeEach(async () => {
  // Monday 2026-06-15 10:00 UTC → tomorrow Tuesday 2026-06-16.
  vi.useFakeTimers({ now: new Date('2026-06-15T10:00:00Z') })
  // Guarantee no real HTTP escapes via the webhook path.
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '' }))
  await resetTable()
  await seedBaseWorld()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('e2e — cron CREATE_RECORDS', () => {
  it('creates tomorrow\'s records for all active users with schedule defaults', async () => {
    const tomorrow = getTomorrowString() // '2026-06-16'

    await cronHandler({ type: 'CREATE_RECORDS' })

    // Four active users → four records for tomorrow, each created with defaults
    // (no schedule published → lunch+snacks enabled → true; others null).
    for (const id of ['admin-1', 'lead-1', 'logistics-1', 'employee-1']) {
      const rec = await getItem(`USER#${id}`, `RECORD#${tomorrow}`)
      expect(rec, `record for ${id}`).toBeDefined()
      expect(rec.lunch).toBe(true)
      expect(rec.snacks).toBe(true)
      expect(rec.workFromHome).toBe(false)
      expect(rec.teamName).toBeTruthy()
    }
  })

  it('preserves a confirmed choice and fills only null fields on an existing record', async () => {
    const tomorrow = getTomorrowString()
    const now = new Date().toISOString()
    // employee-1 already set lunch=true, left snacks=null.
    await putItem({
      PK: 'USER#employee-1', SK: `RECORD#${tomorrow}`,
      discordId: 'employee-1', date: tomorrow,
      lunch: true, snacks: null, iftar: null, eventDinner: null, optionalDinner: null,
      workFromHome: false, teamId: 'team-alpha', teamName: 'Team Alpha',
      createdAt: now, updatedAt: now,
    })

    await cronHandler({ type: 'CREATE_RECORDS' })

    const rec = await getItem('USER#employee-1', `RECORD#${tomorrow}`)
    expect(rec.lunch).toBe(true)   // confirmed choice preserved
    expect(rec.snacks).toBe(true)  // null field filled with default
  })

  it('on a global WFH day, forces all meals false and workFromHome true', async () => {
    const tomorrow = getTomorrowString()
    // WFH period spanning tomorrow.
    await putItem({
      PK: 'WFHPERIOD', SK: `${tomorrow}#wfh-eid`,
      id: 'wfh-eid', dateFrom: tomorrow, dateTo: tomorrow, note: 'Office closed',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })

    await cronHandler({ type: 'CREATE_RECORDS' })

    const rec = await getItem('USER#admin-1', `RECORD#${tomorrow}`)
    expect(rec).toBeDefined()
    expect(rec.lunch).toBe(false)
    expect(rec.snacks).toBe(false)
    expect(rec.iftar).toBe(false)
    expect(rec.eventDinner).toBe(false)
    expect(rec.optionalDinner).toBe(false)
    expect(rec.workFromHome).toBe(true)
  })
})
