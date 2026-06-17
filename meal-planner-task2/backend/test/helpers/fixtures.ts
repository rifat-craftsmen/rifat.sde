import type {
  UserItem, MealRecordItem, MealScheduleItem, Role, WfhPeriodItem,
} from '../../src/types/index.js'

/** Build a UserProfile item (PK=USER#{discordId}, SK=PROFILE). */
export function makeUser(overrides: Partial<UserItem> & { discordId: string }): UserItem {
  const { discordId } = overrides
  return {
    PK: `USER#${discordId}`,
    SK: 'PROFILE',
    name: `User ${discordId}`,
    email: `${discordId}@example.com`,
    role: 'EMPLOYEE' as Role,
    status: 'ACTIVE',
    teamId: 'team-alpha',
    teamName: 'Team Alpha',
    wfhCount: 0,
    wfhMonth: '2026-06',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as UserItem
}

/** Build a MealRecord item (PK=USER#{discordId}, SK=RECORD#{date}). */
export function makeRecord(
  overrides: Partial<MealRecordItem> & { discordId: string; date: string },
): MealRecordItem {
  const { discordId, date } = overrides
  return {
    PK: `USER#${discordId}`,
    SK: `RECORD#${date}`,
    discordId,
    date,
    lunch: null,
    snacks: null,
    iftar: null,
    eventDinner: null,
    optionalDinner: null,
    workFromHome: false,
    teamId: 'team-alpha',
    teamName: 'Team Alpha',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as MealRecordItem
}

/** Build a MealSchedule item (PK=SCHEDULE, SK={date}). */
export function makeSchedule(date: string, overrides: Partial<MealScheduleItem> = {}): MealScheduleItem {
  return {
    PK: 'SCHEDULE',
    SK: date,
    date,
    lunchEnabled: true,
    snacksEnabled: true,
    iftarEnabled: false,
    eventDinnerEnabled: false,
    optionalDinnerEnabled: false,
    createdBy: 'admin',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as MealScheduleItem
}

/** Build a WFH period item (PK=WFHPERIOD, SK={dateFrom}#{uuid}). */
export function makeWfhPeriod(
  overrides: Partial<WfhPeriodItem> & { dateFrom: string; dateTo: string },
): WfhPeriodItem {
  const { dateFrom, dateTo } = overrides
  return {
    PK: 'WFHPERIOD',
    SK: `${dateFrom}#${overrides.id ?? 'wfh-1'}`,
    id: overrides.id ?? 'wfh-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
    dateFrom,
    dateTo,
  } as WfhPeriodItem
}

/** A minimal Discord APPLICATION_COMMAND (type 2) interaction body. */
export function discordInteraction(
  name: string,
  opts: { memberUserId?: string; roles?: string[]; options?: Array<{ name: string; value: any }> } = {},
) {
  return {
    type: 2,
    data: { name, options: opts.options ?? [] },
    member: {
      user: { id: opts.memberUserId ?? 'user-1' },
      roles: opts.roles ?? [],
    },
  }
}

/** A Discord PING (type 1) interaction body. */
export function discordPing() {
  return { type: 1 }
}

/**
 * A Google Chat slash-command event body.
 * - commandName: without leading slash (controller strips it)
 * - email: sender identity (googleAuth reads event.user.email)
 * - argumentText: text after the command (e.g. "2026-06-20 lunch")
 */
export function googleEvent(
  commandName: string,
  opts: { email?: string; argumentText?: string } = {},
) {
  return {
    type: 'MESSAGE',
    user: { email: opts.email ?? 'user-1@example.com' },
    message: {
      name: 'spaces/x/messages/y',
      annotations: [
        { type: 'SLASH_COMMAND', slashCommand: { commandName: `/${commandName}` } },
      ],
      argumentText: opts.argumentText ?? '',
      thread: { name: 'spaces/x/threads/y' },
    },
  }
}
