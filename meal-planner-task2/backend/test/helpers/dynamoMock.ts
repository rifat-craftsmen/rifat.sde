import { vi } from 'vitest'

/**
 * Scriptable mock for the dynamoClient module.
 *
 * vi.mock is hoisted, so the factory cannot close over ordinary variables.
 * We use vi.hoisted() to create the mock send fn + mutable state at hoist time,
 * then register vi.mock at this module's top level. Importing this helper from
 * a test file registers the mock BEFORE the SUT imports dynamoClient.
 *
 * The mock state is mutable: re-script per test via scriptDynamo(); the live
 * send fn reads the current state on every call. No vi.resetModules needed.
 */
const mock = vi.hoisted(() => {
  const sent: any[] = []
  const state: {
    get: Record<string, any>
    query: any[]
    batchGet: Record<string, any[]>
  } = { get: {}, query: [], batchGet: {} }

  const send = vi.fn(async (cmd: any) => {
    sent.push(cmd)
    const name = cmd?.constructor?.name

    if (name === 'GetCommand') {
      return { Item: state.get[JSON.stringify(cmd.input.Key)] }
    }
    if (name === 'QueryCommand') {
      // Each entry IS the Items array (not wrapped). The mock wraps it: { Items: entry }.
      return { Items: state.query.length ? state.query.shift() : [] }
    }
    if (name === 'BatchGetCommand') {
      const table = Object.keys(cmd.input.RequestItems)[0]
      const key = JSON.stringify(Object.keys(cmd.input.RequestItems))
      return { Responses: { [table]: state.batchGet[key] ?? [] } }
    }
    // Put / Update / Delete / BatchWrite / TransactWrite → no-op success
    return {}
  })

  return { sent, state, send }
})

vi.mock('../../src/config/dynamoClient.js', () => ({
  dynamo: { send: mock.send },
  TABLES: { MAIN: 'trainee-2026-rifat-mhp-v2' },
}))

export interface DynamoScript {
  /** Map of stringified-Key → item (or undefined). */
  get?: Record<string, any>
  /** Queue of raw Items[] arrays (FIFO); each QueryCommand pops the front entry. */
  query?: any[]
  /** Map of JSON(RequestItems keys) → items[] (BatchGetCommand). */
  batchGet?: Record<string, any[]>
}

/** Re-script the mock's responses (replaces previous state). Returns the live state. */
export function scriptDynamo(s: DynamoScript = {}) {
  mock.state.get = s.get ?? {}
  mock.state.query = s.query ? [...s.query] : []
  mock.state.batchGet = s.batchGet ?? {}
  return mock.state
}

/** Clear recorded calls + state. */
export function resetDynamo() {
  mock.sent.length = 0
  mock.send.mockClear()
  scriptDynamo({})
}

export const dynamo = { send: mock.send }
export const TABLES = { MAIN: 'trainee-2026-rifat-mhp-v2' }
export const sentCommands = mock.sent

export function findSent(className: string): any {
  return mock.sent.find(c => c?.constructor?.name === className)
}
export function findAllSent(className: string): any[] {
  return mock.sent.filter(c => c?.constructor?.name === className)
}
