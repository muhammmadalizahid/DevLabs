import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

/**
 * Creates an isolated SQLite sandbox for query execution
 * Uses in-memory database for auto-cleanup after execution
 * @returns {Promise<Database>} Opened SQLite database connection
 */
export async function createSandbox() {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database,
  })

  return db
}

/**
 * Closes sandbox and cleans up resources
 * @param {Database} db - SQLite database connection
 */
export async function closeSandbox(db) {
  if (db) {
    await db.close()
  }
}
