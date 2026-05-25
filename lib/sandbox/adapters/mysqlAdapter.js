/**
 * MySQL sandbox adapter (scaffold)
 *
 * WARNING: This is a scaffold for implementing a MySQL-compatible sandbox.
 * Running MySQL in an isolated, per-request sandbox usually requires containers
 * or a deterministic SQL engine that emulates MySQL. Implementing a secure
 * per-request MySQL sandbox is non-trivial and platform-dependent.
 *
 * Suggested approaches:
 * - Use ephemeral Docker containers spun up per request (heavy, requires Docker).
 * - Use a dedicated pool of pre-warmed containers/workers that accept SQL jobs.
 * - Use a MySQL-compatible in-memory engine (if available) as a safe alternative.
 *
 * This file provides placeholder functions so the codebase can be extended
 * later without breaking existing SQLite behavior.
 */

export async function createMySQLSandbox() {
  throw new Error('MySQL sandbox adapter not implemented. See docs/MYSQL_ADAPTER.md for guidance.')
}

export async function closeMySQLSandbox(db) {
  // No-op placeholder
  return
}
