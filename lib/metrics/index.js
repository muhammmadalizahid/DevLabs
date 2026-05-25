import client from 'prom-client'

// Default registry
const register = new client.Registry()
client.collectDefaultMetrics({ register })

// Jobs metrics
const jobEnqueued = new client.Counter({ name: 'devlab_jobs_enqueued_total', help: 'Total jobs enqueued', registers: [register] })
const jobCompleted = new client.Counter({ name: 'devlab_jobs_completed_total', help: 'Total jobs completed', registers: [register] })
const jobFailed = new client.Counter({ name: 'devlab_jobs_failed_total', help: 'Total jobs failed', registers: [register] })
const jobDuration = new client.Histogram({ name: 'devlab_job_duration_seconds', help: 'Job duration seconds', buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5], registers: [register] })
const jobConcurrent = new client.Gauge({ name: 'devlab_jobs_concurrent', help: 'Current concurrent running jobs', registers: [register] })

export { register, jobEnqueued, jobCompleted, jobFailed, jobDuration, jobConcurrent }
export default register
