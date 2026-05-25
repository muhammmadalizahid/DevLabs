'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { AlertCircle } from 'lucide-react';

export default function PlagiarismPage() {
  const { id } = useParams(); // classroom id
  const { loading } = useRequireRole('teacher');
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState('');
  const [pairs, setPairs] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPair, setModalPair] = useState(null);
  const [modalDetails, setModalDetails] = useState({ a: null, b: null, loading: false });

  useEffect(() => {
    if (!loading && id) {
      fetch(`/api/tests?classroomId=${id}`).then(r => r.json()).then(d => { setTests(d); if (d[0]) setSelectedTest(d[0].id); });
    }
  }, [loading, id]);

  useEffect(() => { if (selectedTest) fetchPairs(); }, [selectedTest]);

  async function fetchPairs() {
    setFetching(true);
    const res = await fetch(`/api/plagiarism/scan/${selectedTest}`);
    if (res.ok) setPairs((await res.json()).pairs ?? []);
    setFetching(false);
  }

  async function openPair(pair) {
    setModalPair(pair);
    setModalOpen(true);
    setModalDetails({ a: null, b: null, loading: true });
    try {
      const [ra, rb] = await Promise.all([
        fetch(`/api/submissions/${pair.a.submission_id}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/submissions/${pair.b.submission_id}`).then(r => r.ok ? r.json() : null),
      ]);
      setModalDetails({ a: ra, b: rb, loading: false });
    } catch (e) {
      setModalDetails({ a: null, b: null, loading: false });
    }
  }

  async function postReview(action) {
    if (!modalPair) return
    const payload = {
      a_submission_id: modalPair.a.submission_id,
      b_submission_id: modalPair.b.submission_id,
      test_id: selectedTest,
      action
    }
    try {
      const res = await fetch('/api/plagiarism/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) {
        // refresh list
        await fetchPairs()
        setModalOpen(false)
      } else {
        console.error('Review failed', await res.text())
      }
    } catch (e) {
      console.error(e)
    }
  }

  const columns = [
    { key: 'score', label: 'Score', render: (v, r) => <strong>{Math.round((r.score ?? 0) * 100)}%</strong> },
    { key: 'a', label: 'Submission A', render: (_, r) => <div><div style={{ fontWeight: 600 }}>#{r.a.submission_id}</div><div className="text-xs text-muted">{(r.a.query_text || '').slice(0,120)}</div></div> },
    { key: 'b', label: 'Submission B', render: (_, r) => <div><div style={{ fontWeight: 600 }}>#{r.b.submission_id}</div><div className="text-xs text-muted">{(r.b.query_text || '').slice(0,120)}</div></div> },
    { key: 'actions', label: '', sortable: false, render: (_, r) => <button className="btn btn-ghost btn-sm" onClick={() => openPair(r)}>View</button> },
  ];

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="page-layout">
      <Sidebar classroomId={id} />
      <div className="page-content">
        <Navbar title="Plagiarism Review" actions={selectedTest && <a href={`/api/plagiarism/scan/${selectedTest}`} className="btn btn-secondary btn-sm">Refresh</a>} />

        <div style={{ marginBottom: 24 }}>
          <select className="form-input" style={{ width: 'auto', minWidth: 220 }} value={selectedTest} onChange={e => setSelectedTest(e.target.value)}>
            {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>

        {fetching
          ? <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
          : pairs.length === 0
            ? <div className="card empty-state"><AlertCircle size={40} /><h3>No flagged pairs</h3><p>No similar submissions detected for this test.</p></div>
            : <div className="card p-0"><DataTable columns={columns} data={pairs} emptyMessage="No pairs found" /></div>
        }

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalPair ? `Pair: ${Math.round((modalPair.score ?? 0) * 100)}%` : 'Pair details'}>
          {modalDetails.loading ? <div className="spinner" /> : (
            modalPair ? (
              <div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <h4>Submission A #{modalPair.a.submission_id}</h4>
                    <pre className="card" style={{ whiteSpace: 'pre-wrap', padding: 12 }}>{modalPair.a.query_text}</pre>
                    {modalDetails.a && <div className="text-xs text-muted">Student: {modalDetails.a.student_id} • Submitted: {modalDetails.a.submitted_at ?? '—'}</div>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4>Submission B #{modalPair.b.submission_id}</h4>
                    <pre className="card" style={{ whiteSpace: 'pre-wrap', padding: 12 }}>{modalPair.b.query_text}</pre>
                    {modalDetails.b && <div className="text-xs text-muted">Student: {modalDetails.b.student_id} • Submitted: {modalDetails.b.submitted_at ?? '—'}</div>}
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" onClick={() => postReview('ignore')}>Ignore</button>
                  <button className="btn btn-primary" onClick={() => postReview('reviewed')}>Mark Reviewed</button>
                </div>
              </div>
            ) : <div>Nothing to show</div>
          )}
        </Modal>
      </div>
    </div>
  );
}
