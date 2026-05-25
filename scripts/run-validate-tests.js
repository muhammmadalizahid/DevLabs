import assert from 'assert/strict'
import { validateQuery as v } from '../lib/engine/query-validator.js'

function run() {
  console.log('Running query validator tests...')
  let res

  res = v('SELECT * FROM users')
  assert.equal(res.valid, true)

  res = v('DROP TABLE users')
  assert.equal(res.valid, false)

  res = v('SELECT 1; DROP TABLE users')
  assert.equal(res.valid, false)

  res = v('')
  assert.equal(res.valid, false)

  console.log('Query validator tests passed.')
}

run()
