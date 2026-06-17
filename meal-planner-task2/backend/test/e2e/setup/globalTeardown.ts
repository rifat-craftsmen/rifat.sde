import { dropTable } from './db.js'

/** Runs once after the e2e suite. Leaves no table behind. */
export default async function globalTeardown(): Promise<void> {
  await dropTable()
}
