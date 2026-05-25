#!/usr/bin/env node
/** Simple migration runner: executes SQL files in lib/db/migrations in alphabetical order against DATABASE_URL */
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'lib', 'db', 'migrations');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL env var. Set it and re-run.');
  process.exit(1);
}

async function run() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
    for (const f of files) {
      const p = path.join(MIGRATIONS_DIR, f);
      const sql = fs.readFileSync(p, 'utf8');
      console.log('Running', f);
      await client.query(sql);
    }
    console.log('Migrations applied successfully');
  } catch (err) {
    console.error('Migration error:', err.message || err);
    process.exitCode = 2;
  } finally {
    await client.end();
  }
}

run();
