'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRequireRole } from '@/lib/hooks/useRequireRole'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'
import DataTable from '@/components/DataTable'
import { BarChart2 } from 'lucide-react'

export default function StudentResultsPage() {
  const { loading } = useRequireRole('student')
  const [fetching, setFetching] = useState(true)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading) return

    fetch('/api/results/my')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load results.')
        setResults(Array.isArray(data) ? data : [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setFetching(false))
  }, [loading])

  const columns = [
    {
      key: 'test_title',
      label: 'Test',
      render: (value, row) => (
        <Link href={`/student/results/${row.test_id}`} style={{ fontWeight: 700, color: 'var(--accent)' }}>
          {value}
        </Link>
      ),
    },
    {
      key: 'score',
      label: 'Score',
      render: (_, row) => <strong>{row.total_score ?? 0} / {row.max_score ?? 0}</strong>,
    },
    {
      key: 'class_average_pct',
      label: 'Class Average',
      render: (value) => value === null || value === undefined ? '-' : `${value}%`,
    },
    {
      key: 'percentage',
      label: 'Your %',
      render: (value) => `${value ?? 0}%`,
    },
    {
      key: 'submitted_at',
      label: 'Submitted',
      render: (value) => value ? new Date(value).toLocaleString() : '-',
    },
  ]

  if (loading || fetching) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>

  return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        <Navbar title="My Results" />

        {error ? (
          <div className="card empty-state"><p>{error}</p></div>
        ) : results.length === 0 ? (
          <div className="card empty-state">
            <BarChart2 size={40} />
            <h3>No results yet</h3>
            <p>Your submitted test results will appear here.</p>
          </div>
        ) : (
          <div className="card p-0">
            <DataTable columns={columns} data={results} emptyMessage="No results found" />
          </div>
        )}
      </div>
    </div>
  )
}
