/**
 * In-process job queue for query execution.
 * - Opt-in via ENABLE_EXECUTION_WORKER=1
 * - Configurable concurrency via WORKER_CONCURRENCY
 * - Uses `executeQuery` from `lib/engine/execute` to run jobs.
 *
 * This is a lightweight prototype intended to be replaced by a Redis/Bull
 * worker pool for production scale.
 */

import { executeQuery } from '@/lib/engine/execute'
import { jobEnqueued, jobCompleted, jobFailed, jobDuration, jobConcurrent } from '@/lib/metrics/index.js'

const DEFAULT_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '2', 10)

// If configured, use Redis-backed queue implementation.
const WORKER_BACKEND = process.env.WORKER_BACKEND === 'redis' ? 'redis' : 'inproc'

class JobQueue {
  constructor(concurrency = DEFAULT_CONCURRENCY) {
    this.concurrency = concurrency
    this.queue = []
    this.running = 0
  }

  push(fn) {
    jobEnqueued.inc()
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject })
      this._maybeRun()
    })
  }

  _maybeRun() {
    if (this.running >= this.concurrency) return
    const job = this.queue.shift()
    if (!job) return
    this.running++
    jobConcurrent.set(this.running)
    const end = jobDuration.startTimer()
    Promise.resolve()
      .then(job.fn)
      .then((res) => {
        job.resolve(res)
        jobCompleted.inc()
      })
      .catch((err) => {
        job.reject(err)
        jobFailed.inc()
      })
      .finally(() => {
        end()
        this.running--
        jobConcurrent.set(this.running)
        setImmediate(() => this._maybeRun())
      })
  }
}

const queue = new JobQueue(DEFAULT_CONCURRENCY)

/**
 * Enqueue a query execution job. Returns the same shape as `executeQuery`.
 */
export async function enqueueExecution(query, datasetId, timeoutMs) {
  if (WORKER_BACKEND === 'redis') {
    const { enqueueExecution: enqueueRedisExecution } = await import('./redisQueue.js')
    return enqueueRedisExecution(query, datasetId, timeoutMs)
  }

  return queue.push(() => executeQuery(query, datasetId, timeoutMs))
}

export default { enqueueExecution }
