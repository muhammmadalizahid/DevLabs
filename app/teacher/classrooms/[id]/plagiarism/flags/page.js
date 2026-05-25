'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import DataTable from '@/components/DataTable';
import { Download } from 'lucide-react';

export default function FlagsPage() {
  const { id } = useParams();
  const { loading } = useRequireRole('teacher');
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState('');
  const [pairs, setPairs] = useState([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && id) fetch(`/api/tests?classroomId=${id}`).then(r => r.json()).then(d => { setTests(d); if (d[0]) setSelectedTest(d[0].id); });
  }, [loading, id]);

  useEffect(() => { if (selectedTest) fetchPairs(); }, [selectedTest]);

  async function fetchPairs() {
    setFetching(true);
    const res = await fetch(`/api/plagiarism/scan/${selectedTest}`);
    if (res.ok) {
      const data = await res.json();
      // only show pairs that have a stored flag record
      setPairs((data.pairs || []).filter(p => p.flag != null));
    }
    setFetching(false);
  }

  async function exportCSV() {
    const res = await fetch(`/api/plagiarism/scan/${selectedTest}`);
    if (!res.ok) return
    const data = await res.json()
    const rows = ['score,a_submission_id,b_submission_id,flag_status,reviewer_id,reviewed_at']
    for (const p of (data.pairs || [])) {
      const f = p.flag
      rows.push(`${Math.round((p.score||0)*100)}%,${p.a.submission_id},${p.b.submission_id},${f?.status||''},${f?.reviewer_id||''},${f?.reviewed_at||''}`)
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `plagiarism_${selectedTest || 'all'}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const columns = [
    { key: 'score', label: 'Score', render: (v, r) => <strong>{Math.round((r.score ?? 0) * 100)}%</strong> },
    { key: 'a', label: 'A (submission)', render: (_, r) => <div>#{r.a.submission_id}<div className="text-xs text-muted">{(r.a.query_text||'').slice(0,120)}</div></div> },
    { key: 'b', label: 'B (submission)', render: (_, r) => <div>#{r.b.submission_id}<div className="text-xs text-muted">{(r.b.query_text||'').slice(0,120)}</div></div> },
    { key: 'status', label: 'Flag', render: (_, r) => r.flag?.status || 'flagged' },
    { key: 'reviewer', label: 'Reviewer', render: (_, r) => r.flag?.reviewer_id || '—' },
    { key: 'reviewed_at', label: 'Reviewed', render: (_, r) => r.flag?.reviewed_at ? new Date(r.flag.reviewed_at).toLocaleString() : '—' },
    { key: 'actions', label: '', render: (_, r) => <a href={`/teacher/classrooms/${id}/plagiarism`} className="btn btn-ghost btn-sm">Open</a> }
  ];

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="page-layout">
      <Sidebar classroomId={id} />
      <div className="page-content">
        <Navbar title="Flagged Submissions" actions={selectedTest && <button className="btn btn-secondary btn-sm" onClick={exportCSV}><Download size={14}/> CSV</button>} />

        <div style={{ marginBottom: 24 }}>
          <select className="form-input" style={{ width: 'auto', minWidth: 220 }} value={selectedTest} onChange={e => setSelectedTest(e.target.value)}>
            {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>

        {fetching
          ? <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
          : pairs.length === 0
            ? <div className="card empty-state"><h3>No flagged items</h3><p>No reviewed or ignored pairs yet.</p></div>
            : <div className="card p-0"><DataTable columns={columns} data={pairs} emptyMessage="No flagged pairs" /></div>
        }
      </div>
    </div>
  );
}
