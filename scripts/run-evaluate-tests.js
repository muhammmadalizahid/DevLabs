import assert from 'assert/strict'
import { evaluateAnswerPartial } from '../lib/engine/evaluate.js'

function run() {
  console.log('Running evaluateAnswerPartial tests...')

  // Test 1: exact match
  let actual = [{ id: 1, name: 'Alice' }]
  let expected = [{ id: 1, name: 'Alice' }]
  let res = evaluateAnswerPartial(actual, expected, false)
  assert.equal(res.percent, 100, 'Exact match should yield 100%')

  // Test 2: order-insensitive, same count but different data
  actual = [{ id: 1, name: 'Bob' }]
  expected = [{ id: 1, name: 'Alice' }]
  res = evaluateAnswerPartial(actual, expected, false)
  assert.equal(res.percent, 50, 'Same row count should yield 50% (order-insensitive)')

  // Test 3: order-sensitive mismatch
  actual = [{ id: 1 }]
  expected = [{ id: 2 }]
  res = evaluateAnswerPartial(actual, expected, true)
  assert.equal(res.percent, 50, 'Order-sensitive same count should yield 50% heuristic')

  // Test 4: count mismatch
  actual = [{ id: 1 }]
  expected = [{ id: 1 }, { id: 2 }]
  res = evaluateAnswerPartial(actual, expected, false)
  assert.equal(res.percent, 0, 'Different counts should yield 0%')

  console.log('All evaluateAnswerPartial tests passed.')
}

try {
  run()
  process.exit(0)
} catch (err) {
  console.error('Tests failed:', err.message)
  process.exit(1)
}
