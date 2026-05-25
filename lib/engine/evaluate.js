/**
 * Evaluate a student's query output against expected output.
 * @param {object[]} actualRows
 * @param {object[]} expectedRows
 * @param {boolean} orderSensitive
 * @returns {{ isCorrect: boolean, actualCount: number, expectedCount: number }}
 */
export function evaluateAnswer(actualRows, expectedRows, orderSensitive = false) {
  if (!Array.isArray(actualRows) || !Array.isArray(expectedRows)) {
    return { isCorrect: false, actualCount: 0, expectedCount: 0 };
  }

  if (actualRows.length !== expectedRows.length) {
    return {
      isCorrect: false,
      actualCount: actualRows.length,
      expectedCount: expectedRows.length,
    };
  }

  // Normalize: lowercase keys, stringify values for comparison
  const normalizeRow = (row) => {
    const n = {};
    for (const [k, v] of Object.entries(row)) {
      n[k.toLowerCase()] = v === null ? null : String(v).trim().toLowerCase();
    }
    return n;
  };

  const rowToKey = (row) =>
    Object.entries(normalizeRow(row))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('|');

  const normalizedActual = actualRows.map(normalizeRow);
  const normalizedExpected = expectedRows.map(normalizeRow);

  if (orderSensitive) {
    const isCorrect = normalizedActual.every((row, i) => {
      const aKey = rowToKey(row);
      const eKey = rowToKey(normalizedExpected[i]);
      return aKey === eKey;
    });
    return { isCorrect, actualCount: actualRows.length, expectedCount: expectedRows.length };
  }

  // Order-insensitive: sort both by canonical key then compare
  const sortedActual = [...normalizedActual].map(rowToKey).sort();
  const sortedExpected = [...normalizedExpected].map(rowToKey).sort();

  const isCorrect = sortedActual.every((k, i) => k === sortedExpected[i]);
  return { isCorrect, actualCount: actualRows.length, expectedCount: expectedRows.length };
}

/**
 * Partial grading evaluation. Returns a percentage score (0-100) and metadata.
 * This is non-destructive and used only when partial grading is enabled via
 * the `ENABLE_PARTIAL_GRADING` env flag. It preserves the original
 * `evaluateAnswer` behavior when the flag is not set.
 */
export function evaluateAnswerPartial(actualRows, expectedRows, orderSensitive = false) {
  // Basic sanity
  if (!Array.isArray(actualRows) || !Array.isArray(expectedRows)) {
    return { isCorrect: false, percent: 0, actualCount: 0, expectedCount: 0, feedback: 'Invalid results' };
  }

  const actualCount = actualRows.length;
  const expectedCount = expectedRows.length;

  // Exact match -> full credit
  if (JSON.stringify(actualRows) === JSON.stringify(expectedRows)) {
    return { isCorrect: true, percent: 100, actualCount, expectedCount, feedback: 'Perfect match' };
  }

  // Order-sensitive: if not exact, no partial except row-count heuristic
  if (orderSensitive) {
    if (actualCount === expectedCount && actualCount > 0) {
      return { isCorrect: false, percent: 50, actualCount, expectedCount, feedback: 'Row count matches (order-sensitive) but content differs' };
    }
    return { isCorrect: false, percent: 0, actualCount, expectedCount, feedback: 'Order-sensitive mismatch' };
  }

  // Order-insensitive: use row-count heuristic for partial credit
  if (actualCount === expectedCount && actualCount > 0) {
    return { isCorrect: false, percent: 50, actualCount, expectedCount, feedback: `Row count correct (${actualCount}) but data differs` };
  }

  // Fallback: no credit
  return { isCorrect: false, percent: 0, actualCount, expectedCount, feedback: `Expected ${expectedCount} rows, got ${actualCount}` };
}
