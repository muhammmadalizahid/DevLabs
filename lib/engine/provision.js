import mysql from 'mysql2/promise';

/**
 * Provision a sandboxed MySQL database for a dataset.
 * Creates `devlab_ds_<datasetId>` and seeds it with schema + data.
 * @param {string} datasetId - UUID of the dataset
 * @param {string} schemaSql - CREATE TABLE statements
 * @param {string} seedSql   - INSERT INTO statements
 */
export async function provisionDataset(datasetId, schemaSql, seedSql) {
  const dbName = `devlab_ds_${datasetId.replace(/-/g, '_')}`;

  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    multipleStatements: true,
  });

  try {
    await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await conn.execute(`USE \`${dbName}\``);

    // Drop all existing tables first (idempotent re-provisioning)
    const [tables] = await conn.execute(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = '${dbName}'
    `);
    if (tables.length > 0) {
      await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
      for (const t of tables) {
        await conn.execute(`DROP TABLE IF EXISTS \`${t.table_name}\``);
      }
      await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    }

    // Run schema and seed
    if (schemaSql?.trim()) await conn.query(schemaSql);
    if (seedSql?.trim()) await conn.query(seedSql);
  } finally {
    await conn.end();
  }
}

/**
 * Drop a sandboxed dataset database.
 * @param {string} datasetId
 */
export async function deprovisionDataset(datasetId) {
  const dbName = `devlab_ds_${datasetId.replace(/-/g, '_')}`;
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
  });
  try {
    await conn.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
  } finally {
    await conn.end();
  }
}
