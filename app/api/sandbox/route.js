import { NextResponse } from 'next/server'
import { createSandbox, closeSandbox } from '@/lib/sandbox/createSandbox'
import { validateQuery } from '@/lib/sandbox/validateQuery'
import { importDataset } from '@/lib/sandbox/importDataset'
import { gradeQuery, detailedGradeQuery } from '@/lib/sandbox/gradeQuery'

/**
 * POST /api/sandbox
 * 
 * Executes a student SQL query in isolated SQLite sandbox
 * 
 * Request body:
 * {
 *   query: string,              // SQL SELECT query to execute
 *   dataset: {
 *     csv: string,              // CSV data as string
 *     tableName: string         // Name for the table
 *   },
 *   expectedResult?: Array,     // Expected query result (optional, enables grading)
 *   gradeMode?: 'basic' | 'detailed'  // Grading analysis depth
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   result?: Array,             // Query result rows
 *   grade?: Object,             // Grading info if expectedResult provided
 *   error?: string              // Error message if failed
 * }
 */
export async function POST(req) {
  let db = null

  try {
    // Parse request body
    const body = await req.json()
    const { query, dataset, expectedResult, gradeMode = 'basic' } = body

    // Validate inputs
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      )
    }

    if (!dataset || !dataset.csv || !dataset.tableName) {
      return NextResponse.json(
        { success: false, error: 'Dataset with csv and tableName is required' },
        { status: 400 }
      )
    }

    // Validate query syntax
    validateQuery(query)

    // Create isolated sandbox
    db = await createSandbox()

    // Import dataset into sandbox
    const importInfo = await importDataset(db, dataset.csv, dataset.tableName)

    // Execute student query
    const result = await db.all(query)

    // Grade if expected result provided
    let grade = null
    if (expectedResult) {
      if (gradeMode === 'detailed') {
        grade = detailedGradeQuery(result, expectedResult)
      } else {
        grade = gradeQuery(result, expectedResult)
      }
    }

    // Success response
    return NextResponse.json({
      success: true,
      result,
      grade,
      datasetInfo: {
        tableCreated: importInfo.tableName,
        rowsImported: importInfo.rowCount,
        columnsCreated: importInfo.columnCount,
      },
    })
  } catch (error) {
    console.error('Sandbox execution error:', error)

    // Distinguish between validation errors and runtime errors
    let statusCode = 500
    let errorMessage = error.message

    if (
      errorMessage.includes('Blocked keyword') ||
      errorMessage.includes('Only SELECT queries') ||
      errorMessage.includes('Query must')
    ) {
      statusCode = 400
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    )
  } finally {
    // Clean up sandbox
    if (db) {
      await closeSandbox(db)
    }
  }
}

/**
 * GET /api/sandbox
 * Returns sandbox status and available features
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    features: {
      sandbox: 'SQLite in-memory isolation',
      queryValidation: 'Prevents dangerous SQL keywords',
      grading: 'Order-insensitive result comparison',
      datasets: 'CSV import support',
    },
    blockedKeywords: [
      'DROP',
      'DELETE',
      'UPDATE',
      'INSERT',
      'ALTER',
      'TRUNCATE',
      'CREATE',
      'ATTACH',
      'PRAGMA',
      'REPLACE',
      'EXEC',
      'EXECUTE',
    ],
    allowedQueries: 'SELECT only',
  })
}
