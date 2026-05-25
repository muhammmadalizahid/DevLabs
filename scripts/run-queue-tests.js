import assert from 'assert/strict'
import { TestQueue } from '../lib/worker/testQueue.js'

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function run() {
  console.log('Running queue integration tests...')
  const q = new TestQueue(2)
  const results = []

  const job = (i, delay) => async () => {
    await sleep(delay)
    return i
  }

  const p1 = q.push(job(1, 200))
  const p2 = q.push(job(2, 100))
  const p3 = q.push(job(3, 50))

  const r = await Promise.all([p1, p2, p3])
  assert.deepEqual(r.sort(), [1,2,3].sort(), 'All jobs should complete')

  console.log('Queue integration tests passed.')
}

run().catch(err => { console.error('Queue tests failed:', err.message); process.exit(1) })
