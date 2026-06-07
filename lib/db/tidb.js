import mysql from 'mysql2/promise'

let tidbPool = null

function sslConfig() {
  if (String(process.env.TIDB_SSL || '').toLowerCase() !== 'true') return undefined
  // Keep TLS strict by default. If your TiDB CA is custom, add `ca` here from env/secret.
  return {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  }
}

export function getTiDBPool() {
  if (tidbPool) return tidbPool

  const host = process.env.TIDB_HOST
  const user = process.env.TIDB_USER
  const password = process.env.TIDB_PASSWORD
  const database = process.env.TIDB_DATABASE || 'devlabs_datasets'
  if (!host || !user || !password) {
    throw new Error('Missing TiDB env vars: TIDB_HOST / TIDB_USER / TIDB_PASSWORD')
  }

  tidbPool = mysql.createPool({
    host,
    port: Number(process.env.TIDB_PORT || 4000),
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: sslConfig(),
  })

  return tidbPool
}

export async function testTiDBConnection() {
  const pool = getTiDBPool()
  const [rows] = await pool.query('SELECT VERSION() AS version')
  return rows
}

