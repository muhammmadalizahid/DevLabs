#!/usr/bin/env node
/** Simple load test: hits an endpoint concurrently and reports basic stats */
import fetch from 'node-fetch';

const URL = process.env.TARGET_URL || 'http://localhost:3000/api/plagiarism/scan/00000000-0000-0000-0000-000000000000';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '20', 10);
const REQS = parseInt(process.env.REQS || '200', 10);

async function worker(id, count) {
  const latencies = [];
  for (let i = 0; i < count; i++) {
    const start = Date.now();
    try {
      const res = await fetch(URL);
      await res.text();
    } catch (e) {
      console.error('Request error', e.message || e);
    }
    latencies.push(Date.now() - start);
  }
  return latencies;
}

async function main() {
  const per = Math.ceil(REQS / CONCURRENCY);
  const parts = Array.from({ length: CONCURRENCY }, (_, i) => worker(i, per));
  const results = await Promise.all(parts);
  const all = results.flat();
  const sum = all.reduce((s, v) => s + v, 0);
  all.sort((a, b) => a - b);
  console.log('Requests:', all.length);
  console.log('Avg:', (sum / all.length).toFixed(2), 'ms');
  console.log('P50:', all[Math.floor(all.length * 0.5)] || 0, 'ms');
  console.log('P95:', all[Math.floor(all.length * 0.95)] || 0, 'ms');
  console.log('Max:', all[all.length - 1] || 0, 'ms');
}

main().catch(e => { console.error(e); process.exit(1); });
