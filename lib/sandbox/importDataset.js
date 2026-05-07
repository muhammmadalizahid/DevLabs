import Papa from 'papaparse'

/**
 * Imports CSV data into SQLite sandbox as a table
 * Automatically creates table schema based on CSV headers
 * @param {Database} db - SQLite database connection
 * @param {string} csvText - CSV data as string
 * @param {string} tableName - Name for the created table
 * @throws {Error} If CSV is empty or invalid
 */
export async function importDataset(db, csvText, tableName) {
  if (!csvText || csvText.trim().length === 0) {
    throw new Error('Dataset CSV cannot be empty')
  }

  if (!tableName || tableName.trim().length === 0) {
    throw new Error('Table name is required')
  }

  // Sanitize table name to prevent SQL injection
  const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '_')

  // Parse CSV
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // Keep all values as strings for consistency
  })

  const rows = parsed.data

  if (!rows || rows.length === 0) {
    throw new Error('Dataset is empty or invalid')
  }

  // Get column names from first row
  const columns = Object.keys(rows[0]).filter((col) => col.trim().length > 0)

  if (columns.length === 0) {
    throw new Error('Dataset has no columns')
  }

  // Create table with all TEXT columns
  const columnDefs = columns.map((col) => `"${col}" TEXT`).join(', ')

  const createTableSQL = `
    CREATE TABLE "${sanitizedTableName}" (
      ${columnDefs}
    )
  `

  await db.exec(createTableSQL)

  // Insert rows
  for (const row of rows) {
    const values = columns.map((col) => row[col] || '')

    const placeholders = values.map(() => '?').join(', ')
    const columnNames = columns.map((col) => `"${col}"`).join(', ')

    const insertSQL = `
      INSERT INTO "${sanitizedTableName}" (${columnNames})
      VALUES (${placeholders})
    `

    await db.run(insertSQL, values)
  }

  return {
    tableName: sanitizedTableName,
    rowCount: rows.length,
    columnCount: columns.length,
    columns,
  }
}

/**
 * Imports multiple CSV files as separate tables
 * Useful for complex datasets with multiple related tables
 * @param {Database} db - SQLite database connection
 * @param {Array} datasets - Array of {csv, tableName} objects
 */
export async function importMultipleDatasets(db, datasets) {
  const results = []

  for (const dataset of datasets) {
    const result = await importDataset(db, dataset.csv, dataset.tableName)
    results.push(result)
  }

  return results
}
