#!/usr/bin/env node
/** Simple smoke test for plagiarism APIs against a running dev server.
 * Requires NEXT dev server running on localhost:3000
 */
import fetch from 'node-fetch';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const TEST_ID = process.env.TEST_ID || '';

async function assertOk(res, name) {
  if (!res.ok) {
    console.error(name, 'failed', res.status);
    process.exitCode = 2;
    console.error(await res.text());
    process.exit(2);
  }
}

async function main() {
  if (!TEST_ID) {
    console.error('Set TEST_ID env to run smoke test');
    process.exit(1);
  }
  console.log('Scanning test', TEST_ID);
  const scan = await fetch(`${BASE}/api/plagiarism/scan/${TEST_ID}`);
  await assertOk(scan, 'scan');
  const body = await scan.json();
  console.log('Pairs returned:', (body.pairs||[]).length);

  // If pairs exist, attempt review on first pair (requires auth cookie — skip if not running auth)
  if ((body.pairs || []).length > 0) {
    console.log('Found pairs; review endpoint test skipped (requires authenticated teacher session)');
  }
  console.log('Smoke tests passed (scan only)');
}

main().catch(e => { console.error(e); process.exit(1); });
