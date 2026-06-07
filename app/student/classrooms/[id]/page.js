'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { FlaskConical } from 'lucide-react';

function formatPst(dateLike) {
  if (!dateLike) return null;
  const dt = new Date(dateLike);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function StudentClassroomPage() {
  const { id } = useParams();
  const { loading } = useRequireRole('student');
  const [tests, setTests] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && id) {
      fetch(`/api/tests?classroomId=${id}`)
        .then(r => r.json())
        .then(d => { setTests(d); setFetching(false); });
    }
  }, [loading, id]);

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        <Navbar title="Available Tests" />
        {fetching ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : tests.length === 0 ? (
          <div className="card empty-state"><FlaskConical size={40} /><h3>No tests yet</h3><p>Your teacher hasn&apos;t published any tests yet.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tests.map(test => {
              const dueLabel = formatPst(test.due_at);
              const isExpired = test.due_at ? Date.now() > new Date(test.due_at).getTime() : false;
              return (
                <div key={test.id} className="card flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ marginBottom: 6 }}>{test.title}</h3>
                    <div className="flex-gap" style={{ flexWrap: 'wrap' }}>
                      <span className="text-sm text-muted">{test.questions?.[0]?.count ?? 0} questions</span>
                      {test.time_limit_mins && <span className="text-sm text-muted">· {test.time_limit_mins} min limit</span>}
                      {dueLabel && <span className="text-sm text-muted">· Due (PKT): {dueLabel}</span>}
                    </div>
                    {test.description && <p className="text-sm" style={{ marginTop: 4 }}>{test.description}</p>}
                  </div>
                  {isExpired ? (
                    <span className="badge badge-danger">Closed</span>
                  ) : (
                    <a href={`/student/tests/${test.id}/attempt`} className="btn btn-primary btn-sm">Start Test →</a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

