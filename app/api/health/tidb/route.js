import { NextResponse } from 'next/server'
import { testTiDBConnection } from '@/lib/db/tidb'

export async function GET() {
  try {
    const rows = await testTiDBConnection()
    return NextResponse.json({
      connected: true,
      version: rows?.[0]?.version || null,
    })
  } catch (err) {
    return NextResponse.json({
      connected: false,
      error: `SQL engine unavailable: ${err.message}`,
    }, { status: 503 })
  }
}

