import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

/**
 * Creates an isolated SQLite sandbox for legacy endpoints.
 * Dataset execution now uses TiDB via lib/db/tidb.js.
 * @param {string} [adapter='sqlite']
 * @returns {Promise<object>} Adapter-specific DB handle
 */
export async function createSandbox(adapter = 'sqlite') {
  if (adapter === 'sqlite') {
    const db = await open({
      filename: ':memory:',
      driver: sqlite3.Database,
    })
    return db
  }

  throw new Error(`Unknown sandbox adapter: ${adapter}`)
}

export async function closeSandbox(db, adapter = 'sqlite') {
  if (!db) return
  if (adapter === 'sqlite') {
    await db.close()
    return
  }

  // fallback
  if (db.close) await db.close()
}
