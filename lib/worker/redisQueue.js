import { Queue, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'
import { jobEnqueued, jobCompleted, jobFailed } from '@/lib/metrics/index.js'

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const QUEUE_NAME = process.env.WORKER_QUEUE_NAME || 'devlab-execute'

const connection = new IORedis(REDIS_URL)
const queue = new Queue(QUEUE_NAME, { connection })
const queueEvents = new QueueEvents(QUEUE_NAME, { connection })

/**
 * Enqueue an execution job and wait for its completion.
 * Returns the result object produced by the worker (same as executeQuery).
 */
export async function enqueueExecution(query, datasetId, timeoutMs = 5000) {
  const job = await queue.add('execute', { query, datasetId, timeoutMs }, {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: false,
    backoff: { type: 'exponential', delay: 500 }
  })
  jobEnqueued.inc()

  return new Promise((resolve, reject) => {
    const onCompleted = async ({ jobId, returnvalue }) => {
      if (jobId === job.id) {
        cleanup()
        resolve(returnvalue)
      }
    }
    const onFailed = async ({ jobId, failedReason }) => {
      if (jobId === job.id) {
        cleanup()
        reject(new Error(failedReason || 'Job failed'))
      }
    }

    function cleanup() {
      queueEvents.removeListener('completed', onCompleted)
      queueEvents.removeListener('failed', onFailed)
    }

    queueEvents.on('completed', onCompleted)
    queueEvents.on('failed', onFailed)

    // Safety: timeout in case worker doesn't respond
    const t = setTimeout(() => {
      cleanup()
      reject(new Error('Execution worker timeout'))
    }, timeoutMs + 2000)

    // make sure timeout cleared on resolve/reject
    const origResolve = resolve
    resolve = (v) => { clearTimeout(t); origResolve(v) }
    const origReject = reject
    reject = (e) => { clearTimeout(t); origReject(e) }
  })
}

export default { enqueueExecution }
