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
