/**
 * Query Validator - Prevent malicious SQL queries
 * Only allows SELECT queries, blocks DELETE, DROP, UPDATE, etc.
 */

const DANGEROUS_KEYWORDS = [
  'DROP',
  'DELETE',
  'TRUNCATE',
  'ALTER',
  'CREATE DATABASE',
  'DROP DATABASE',
  'UPDATE',
  'INSERT',
  'REPLACE',
];

export function validateQuery(query) {
  if (!query || !query.trim()) {
    return {
      valid: false,
      error: '❌ Query cannot be empty',
    };
  }

  const upperQuery = query.toUpperCase().trim();

  // Check for dangerous keywords
  for (const keyword of DANGEROUS_KEYWORDS) {
    if (upperQuery.includes(keyword)) {
      return {
        valid: false,
        error: `❌ '${keyword}' statements are not allowed. Only SELECT queries are permitted.`,
      };
    }
  }

  // Check if starts with SELECT
  if (!upperQuery.startsWith('SELECT')) {
    return {
      valid: false,
      error: '❌ Only SELECT queries are allowed',
    };
  }

  // Check for EXEC, EXECUTE
  if (upperQuery.includes('EXEC') || upperQuery.includes('EXECUTE')) {
    return {
      valid: false,
      error: '❌ Stored procedures are not allowed',
    };
  }

  return { valid: true };
}
