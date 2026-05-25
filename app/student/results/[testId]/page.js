'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { DifficultyBadge } from '@/components/Badge';
import { CheckCircle, XCircle } from 'lucide-react';

export default function StudentResultPage() {
  const { testId } = useParams();
  const { loading } = useRequireRole('student');
  const [result, setResult] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && testId) {
      fetch(`/api/results/my/${testId}`)
        .then(r => r.json()).then(d => { setResult(d); setFetching(false); });
    }
  }, [loading, testId]);

  if (loading || fetching) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;
  if (!result || result.error) return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        <Navbar title="My Result" />
        <div className="card empty-state"><p>Result not found.</p></div>
      </div>
    </div>
  );

  const pct = result.max_score > 0 ? Math.round((result.total_score / result.max_score) * 100) : 0;
  const timeTaken = result.submitted_at && result.started_at
    ? Math.round((new Date(result.submitted_at) - new Date(result.started_at)) / 60000)
    : null;

  return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        <Navbar title="My Result" />
        <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: '40px 24px', background: 'linear-gradient(135deg, var(--accent-light), var(--teal-light))' }}>
          <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: 8 }}>{result.total_score} / {result.max_score} points</div>
          {timeTaken !== null && <div className="text-muted text-sm" style={{ marginTop: 6 }}>Completed in {timeTaken} min</div>}
          <div style={{ marginTop: 12 }}>
            <span className={`badge ${pct >= 60 ? 'badge-success' : 'badge-danger'}`}>{pct >= 60 ? '✓ Passed' : '✗ Needs improvement'}</span>
          </div>
        </div>
        <h2 style={{ marginBottom: 16 }}>Question Breakdown</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(result.submission_answers || []).map((ans, i) => (
            <div key={ans.id} className="card">
              <div className="flex-between" style={{ flexWrap: 'wrap', gap: 8 }}>
                <div className="flex-gap">
                  <span className="text-muted text-sm">Q{i + 1}</span>
                  <DifficultyBadge difficulty={ans.questions?.difficulty} />
                  <span className="badge badge-neutral">{ans.questions?.points ?? 1} pts</span>
                </div>
                {ans.is_correct !== null ? (
                  typeof ans.score === 'number' ? (
                    <span className="flex-gap" style={{ fontWeight: 600 }}>{ans.score} pts{ans.questions?.partial_grading ? ' (partial)' : ''}</span>
                  ) : (
                    <span className="text-muted text-sm">Not evaluated</span>
                  )
                ) : <span className="text-muted text-sm">Not evaluated</span>}
              </div>
              <p style={{ marginTop: 10, fontWeight: 500 }}>{ans.questions?.prompt}</p>
              {ans.query_text && (
                <pre style={{ marginTop: 10, background: 'var(--bg-tertiary)', padding: 12, borderRadius: 'var(--radius-md)', fontSize: '0.82rem', overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
                  {ans.query_text}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
