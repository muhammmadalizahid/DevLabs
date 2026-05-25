#!/usr/bin/env node
import assert from 'assert';
import plagiarism, { jaccard, findSimilarPairs } from '../lib/plagiarism/simple.js';
const { normalizeQuery, tokenize } = plagiarism;

function run() {
  console.log('Running plagiarism unit tests...');

  // normalize & tokenize
  const q1 = "SELECT id, name FROM users WHERE email = 'a@b.com' -- comment";
  const n1 = normalizeQuery(q1);
  const toks = tokenize(q1);
  assert.ok(n1.includes('select'), 'normalize should include select');
  assert.ok(toks.includes('select') && toks.includes('users'), 'tokenize should include select and users');

  // jaccard exact match
  const a = 'SELECT * FROM items';
  const b = 'SELECT * FROM items';
  assert.strictEqual(jaccard(a, b), 1, 'identical queries should have jaccard 1');

  // jaccard partial overlap
  const c = 'SELECT id FROM items';
  const d = 'SELECT name FROM items';
  const jc = jaccard(c, d);
  assert.ok(jc > 0 && jc < 1, 'partial overlap should be between 0 and 1');

  // findSimilarPairs
  const items = [
    { id: '1', submission_id: 's1', query_text: 'SELECT * FROM foo' },
    { id: '2', submission_id: 's2', query_text: 'SELECT * FROM foo' },
    { id: '3', submission_id: 's3', query_text: 'SELECT id FROM bar' },
  ];
  const pairs = findSimilarPairs(items, 0.9);
  assert.ok(pairs.length >= 1, 'should find at least one similar pair');

  console.log('All plagiarism tests passed.');
}

try {
  run();
  process.exit(0);
} catch (e) {
  console.error('Tests failed:', e && e.message ? e.message : e);
  process.exit(2);
}
