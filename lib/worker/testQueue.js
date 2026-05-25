/**
 * Test-only JobQueue to validate queue behavior without executeQuery.
 * Used by integration tests to ensure concurrency and ordering.
 */

export class TestQueue {
  constructor(concurrency = 2) {
    this.concurrency = concurrency
    this.queue = []
    this.running = 0
  }

  push(fn) {
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
    Promise.resolve()
      .then(job.fn)
      .then((res) => job.resolve(res))
      .catch((err) => job.reject(err))
      .finally(() => {
        this.running--
        setImmediate(() => this._maybeRun())
      })
  }
}
