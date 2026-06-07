import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { executeQuery, executeQueriesBatch } from '@/lib/engine/execute'
import { jobCompleted, jobFailed, jobDuration, jobConcurrent } from '@/lib/metrics/index.js'

const REDIS_URL = process.env.REDIS_URL
const QUEUE_NAME = process.env.WORKER_QUEUE_NAME || 'devlab-execute'

if (!REDIS_URL) {
  throw new Error('scripts/worker-redis requires REDIS_URL. Upstash REST credentials are not compatible with BullMQ/ioredis.')
}

const connection = new IORedis(REDIS_URL)
connection.on('error', () => {})

const worker = new Worker(QUEUE_NAME, async (job) => {
  const { query, datasetId, timeoutMs, inputs } = job.data
  try {
    jobConcurrent.inc()
    const end = jobDuration.startTimer()
    let result
    if (job.name === 'execute_batch') {
      result = await executeQueriesBatch(inputs || [], timeoutMs)
      result = Object.fromEntries(result)
    } else {
      result = await executeQuery(query, datasetId, timeoutMs)
    }
    end()
    jobCompleted.inc()
    jobConcurrent.dec()
    return result
  } catch (err) {
    // bubble up error to be handled by BullMQ
    jobFailed.inc()
    jobConcurrent.dec()
    throw err
  }
}, { connection })

worker.on('completed', (job) => {
  console.log('Job completed', job.id)
})

worker.on('failed', (job, err) => {
  console.error('Job failed', job.id, err?.message)
})

console.log('Worker started for queue', QUEUE_NAME)
