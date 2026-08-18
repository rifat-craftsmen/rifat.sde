import { ensureTable, seedBaseWorld } from './db.js'

/** Runs once before the e2e suite. Requires DynamoDB Local already up on :8000. */
export default async function globalSetup(): Promise<void> {
  await ensureTable()
  await seedBaseWorld()
}
