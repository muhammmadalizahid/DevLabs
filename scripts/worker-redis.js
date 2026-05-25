import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { executeQuery } from '@/lib/engine/execute'
import { jobCompleted, jobFailed, jobDuration, jobConcurrent } from '@/lib/metrics/index.js'

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const QUEUE_NAME = process.env.WORKER_QUEUE_NAME || 'devlab-execute'

const connection = new IORedis(REDIS_URL)

const worker = new Worker(QUEUE_NAME, async (job) => {
  const { query, datasetId, timeoutMs } = job.data
  try {
    jobConcurrent.inc()
    const end = jobDuration.startTimer()
    const result = await executeQuery(query, datasetId, timeoutMs)
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
