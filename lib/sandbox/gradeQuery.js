/**
 * Normalizes result data for order-insensitive comparison
 * Sorts rows and stringifies for consistent comparison
 * @param {Array} data - Array of result rows
 * @returns {string} Normalized JSON string
 */
function normalize(data) {
  if (!Array.isArray(data)) {
    return JSON.stringify(data)
  }

  // Sort rows by their stringified version for consistent ordering
  const sorted = [...data].sort((a, b) =>
    JSON.stringify(a).localeCompare(JSON.stringify(b))
  )

  return JSON.stringify(sorted)
}

/**
 * Compares student query result with expected result
 * Order-insensitive comparison (ignores row order)
 * @param {Array} studentResult - Student's query result rows
 * @param {Array} expectedResult - Expected query result rows
 * @returns {Object} {correct: boolean, score: number, message: string}
 */
export function gradeQuery(studentResult, expectedResult) {
  try {
    const studentNorm = normalize(studentResult)
    const expectedNorm = normalize(expectedResult)

    const correct = studentNorm === expectedNorm

    return {
      correct,
      score: correct ? 100 : 0,
      message: correct
        ? 'Query result matches expected output'
        : 'Query result does not match expected output',
      studentRowCount: Array.isArray(studentResult) ? studentResult.length : 0,
      expectedRowCount: Array.isArray(expectedResult)
        ? expectedResult.length
        : 0,
    }
  } catch (error) {
    return {
      correct: false,
      score: 0,
      message: `Grading error: ${error.message}`,
      studentRowCount: 0,
      expectedRowCount: 0,
    }
  }
}

/**
 * Partial credit grading based on row count match
 * Awards points if row count is correct even if content differs
 * Useful for debugging student queries
 * @param {Array} studentResult - Student's query result
 * @param {Array} expectedResult - Expected result
 * @returns {Object} {correct: boolean, score: number, feedback: string}
 */
export function gradeQueryPartialCredit(studentResult, expectedResult) {
  const studentCount = Array.isArray(studentResult) ? studentResult.length : 0
  const expectedCount = Array.isArray(expectedResult)
    ? expectedResult.length
    : 0

  // Full credit if exact match
  if (JSON.stringify(studentResult) === JSON.stringify(expectedResult)) {
    return {
      correct: true,
      score: 100,
      feedback: 'Perfect! All rows and data match.',
    }
  }

  // Partial credit if row count matches
  if (studentCount === expectedCount && studentCount > 0) {
    return {
      correct: false,
      score: 50,
      feedback: `Row count correct (${studentCount} rows), but data content differs. Check your query logic.`,
    }
  }

  // No credit if row count is wrong
  return {
    correct: false,
    score: 0,
    feedback: `Expected ${expectedCount} rows, got ${studentCount}. Review your query.`,
  }
}

/**
 * Compare query results with detailed column-by-column analysis
 * @param {Array} studentResult
 * @param {Array} expectedResult
 * @returns {Object} Detailed comparison report
 */
export function detailedGradeQuery(studentResult, expectedResult) {
  const base = gradeQuery(studentResult, expectedResult)

  if (!Array.isArray(studentResult) || !Array.isArray(expectedResult)) {
    return base
  }

  // Analyze column differences
  const studentCols = studentResult.length > 0 ? Object.keys(studentResult[0]) : []
  const expectedCols =
    expectedResult.length > 0 ? Object.keys(expectedResult[0]) : []

  const colDifferences = {
    missing: expectedCols.filter((col) => !studentCols.includes(col)),
    extra: studentCols.filter((col) => !expectedCols.includes(col)),
  }

  return {
    ...base,
    studentColumns: studentCols,
    expectedColumns: expectedCols,
    columnDifferences: colDifferences,
  }
}
