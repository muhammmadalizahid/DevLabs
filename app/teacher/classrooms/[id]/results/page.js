'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import DataTable from '@/components/DataTable';
import { StatusBadge } from '@/components/Badge';
import { Download, BarChart2 } from 'lucide-react';

export default function ResultsPage() {
  const { id } = useParams();
  const { loading } = useRequireRole('teacher');
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState('');
  const [results, setResults] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && id) {
      fetch(`/api/tests?classroomId=${id}`)
        .then(r => r.json())
        .then(d => {
          const list = Array.isArray(d) ? d : [];
          setTests(list);
          setSelectedTest(list[0]?.id || '');
        });
    }
  }, [loading, id]);

  useEffect(() => { if (selectedTest) fetchResults(); }, [selectedTest, statusFilter]);

  async function fetchResults() {
    setFetching(true);
    const url = `/api/results/test/${selectedTest}${statusFilter ? `?status=${statusFilter}` : ''}`;
    const res = await fetch(url);
    if (res.ok) setResults(await res.json());
    setFetching(false);
  }

  const columns = [
    { key: 'name',         label: 'Student',    render: (_, r) => <div><div style={{ fontWeight: 600 }}>{r.users?.name}</div><div className="text-xs text-muted">{r.users?.email}</div></div> },
    { key: 'total_score',  label: 'Score',      render: (v, r) => <strong>{v ?? 0} / {r.max_score}</strong> },
    { key: 'pct',          label: '%',          sortable: false, render: (_, r) => r.max_score > 0 ? `${Math.round(((r.total_score ?? 0) / r.max_score) * 100)}%` : '—' },
    { key: 'status',       label: 'Status',     render: v => <StatusBadge status={v} /> },
    { key: 'submitted_at', label: 'Submitted',  render: v => v ? new Date(v).toLocaleString() : '—' },
    { key: 'actions',      label: '', sortable: false, render: (_, r) => <a href={`/teacher/submissions/${r.id}`} className="btn btn-ghost btn-sm">View</a> },
  ];

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="page-layout">
      <Sidebar classroomId={id} />
      <div className="page-content">
        <Navbar title="Results" actions={selectedTest ? <>
          <a href={`/api/export/csv/${selectedTest}`} className="btn btn-secondary btn-sm"><Download size={14}/> CSV</a>
          <a href={`/api/export/excel/${selectedTest}`} className="btn btn-secondary btn-sm"><Download size={14}/> Excel</a>
        </> : null} />

        <div className="flex-gap" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
          <select className="form-input" style={{ width: 'auto', minWidth: 220 }}
            value={selectedTest || '__no_tests__'} onChange={e => setSelectedTest(e.target.value === '__no_tests__' ? '' : e.target.value)}>
            <option value="__no_tests__" disabled>
              {tests.length > 0 ? 'Select a test' : 'No tests available yet'}
            </option>
            {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }}
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>

        {fetching
          ? <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
          : !selectedTest
            ? <div className="card empty-state"><BarChart2 size={40} /><h3>No tests yet</h3><p>Create a test and publish it to start seeing results here.</p></div>
            : results.length === 0
            ? <div className="card empty-state"><BarChart2 size={40} /><h3>No results yet</h3><p>Results will appear here once students submit.</p></div>
            : <div className="card p-0"><DataTable columns={columns} data={results} emptyMessage="No results found" /></div>
        }
      </div>
    </div>
  );
}
