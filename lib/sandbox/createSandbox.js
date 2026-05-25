import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

/**
 * Creates an isolated sandbox for query execution.
 * Supports adapter selection in the future (e.g., 'sqlite' or 'mysql').
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

  // Future adapters can be implemented under lib/sandbox/adapters
  if (adapter === 'mysql') {
    const { createMySQLSandbox } = await import('./adapters/mysqlAdapter.js')
    return createMySQLSandbox()
  }

  throw new Error(`Unknown sandbox adapter: ${adapter}`)
}

export async function closeSandbox(db, adapter = 'sqlite') {
  if (!db) return
  if (adapter === 'sqlite') {
    await db.close()
    return
  }

  if (adapter === 'mysql') {
    const { closeMySQLSandbox } = await import('./adapters/mysqlAdapter.js')
    return closeMySQLSandbox(db)
  }

  // fallback
  if (db.close) await db.close()
}
