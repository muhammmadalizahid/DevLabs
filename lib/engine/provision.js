import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { getSupabaseAdmin } from '@/lib/db/supabase'

/**
 * Converts SQLite table data to CSV format
 * @param {Array} rows - Array of row objects from db.all()
 * @returns {string} CSV formatted data
 */
function tableToCsv(rows) {
  if (!rows || rows.length === 0) {
    return ''
  }

  // Get column names from first row
  const columns = Object.keys(rows[0])

  // Create header
  const header = columns.map((col) => `"${col}"`).join(',')

  // Create rows
  const csvRows = rows.map((row) =>
    columns
      .map((col) => {
        const value = row[col]
        // Escape quotes and wrap in quotes if contains comma/newline/quote
        if (value === null || value === undefined) {
          return ''
        }
        const strValue = String(value)
        if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
          return `"${strValue.replace(/"/g, '""')}"`
        }
        return `"${strValue}"`
      })
      .join(',')
  )

  return [header, ...csvRows].join('\n')
}

/**
 * Provision a sandboxed dataset using SQLite + Supabase Storage.
 * 
 * Flow:
 * 1. Create temporary SQLite in-memory database
 * 2. Execute schema SQL (CREATE TABLE statements)
 * 3. Execute seed SQL (INSERT statements)
 * 4. Export each table to CSV format
 * 5. Upload CSVs to Supabase Storage
 * 6. Update datasets table with storage_path
 * 
 * @param {string} datasetId - UUID of the dataset
 * @param {string} schemaSql - CREATE TABLE statements
 * @param {string} seedSql   - INSERT INTO statements
 */
export async function provisionDataset(datasetId, schemaSql, seedSql) {
  let db = null

  try {
    // Step 1: Create temporary SQLite in-memory database
    db = await open({
      filename: ':memory:',
      driver: sqlite3.Database,
    })

    // Step 2: Execute schema SQL
    if (schemaSql?.trim()) {
      await db.exec(schemaSql)
    }

    // Step 3: Execute seed SQL
    if (seedSql?.trim()) {
      await db.exec(seedSql)
    }

    // Step 4: Get all table names
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `)

    if (!tables || tables.length === 0) {
      throw new Error('No tables created from schema SQL')
    }

    // Step 5: Export each table to CSV and upload to Supabase Storage
    const supabase = getSupabaseAdmin()
    const storagePaths = []

    for (const table of tables) {
      const tableName = table.name

      // Get table data
      const rows = await db.all(`SELECT * FROM "${tableName}"`)

      // Convert to CSV
      const csv = tableToCsv(rows)

      // Upload to Supabase Storage
      const storagePath = `datasets/${datasetId}/${tableName}.csv`

      const { error: uploadError } = await supabase.storage
        .from('datasets')
        .upload(storagePath, Buffer.from(csv), {
          contentType: 'text/csv',
          upsert: true, // Overwrite if exists
        })

      if (uploadError) {
        throw new Error(`Failed to upload ${tableName}.csv: ${uploadError.message}`)
      }

      storagePaths.push(storagePath)
    }

    // Step 6: Update datasets table with primary table storage path
    // (Use first table as main table for compatibility)
    const primaryTablePath = storagePaths[0]

    // Try to update, but don't fail if columns don't exist
    try {
      await supabase
        .from('datasets')
        .update({
          storage_path: primaryTablePath,
          table_name: tables[0].name,
        })
        .eq('id', datasetId)
    } catch (columnError) {
      // Columns might not exist yet, that's okay
      console.warn('Could not update storage_path/table_name columns:', columnError.message)
    }

    return {
      success: true,
      datasetId,
      tablesCreated: tables.length,
      storagePaths,
    }
  } catch (err) {
    console.error('Provision dataset error:', err)
    throw err
  } finally {
    // Step 7: Clean up temporary database
    if (db) {
      await db.close()
    }
  }
}

/**
 * Delete a dataset from Supabase Storage.
 * @param {string} datasetId - UUID of the dataset
 */
export async function deprovisionDataset(datasetId) {
  try {
    const supabase = getSupabaseAdmin()

    // List all files in dataset folder
    const { data: files, error: listError } = await supabase.storage
      .from('datasets')
      .list(`datasets/${datasetId}`)

    if (listError) {
      console.error('Failed to list dataset files:', listError)
      return
    }

    // Delete all files
    if (files && files.length > 0) {
      const filePaths = files.map((f) => `datasets/${datasetId}/${f.name}`)

      const { error: deleteError } = await supabase.storage
        .from('datasets')
        .remove(filePaths)

      if (deleteError) {
        console.error('Failed to delete dataset files:', deleteError)
      }
    }

    // Clear storage_path from datasets table
    await supabase.from('datasets').update({ storage_path: null }).eq('id', datasetId)
  } catch (err) {
    console.error('Deprovision dataset error:', err)
    throw err
  }
}
