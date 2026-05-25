'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import OutputTable from '@/components/OutputTable';
import { DifficultyBadge, StatusBadge } from '@/components/Badge';
import { CheckCircle, XCircle } from 'lucide-react';

export default function SubmissionDetailPage() {
  const { id } = useParams();
  const { loading } = useRequireRole('teacher');
  const [submission, setSubmission] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && id) {
      fetch(`/api/results/submission/${id}`)
        .then(r => r.json()).then(d => { setSubmission(d); setFetching(false); });
    }
  }, [loading, id]);

  if (loading || fetching) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;
  if (!submission) return <div className="flex-center" style={{ height: '100vh' }}><p>Submission not found.</p></div>;

  const pct = submission.max_score > 0 ? Math.round((submission.total_score / submission.max_score) * 100) : 0;

  return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        <Navbar title="Submission Detail" />

        {/* Score card */}
        <div className="card" style={{ marginBottom: 24, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div className="stat-value">{submission.total_score} / {submission.max_score}</div>
            <div className="stat-label">Total Score ({pct}%)</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{submission.users?.name}</div>
            <div className="text-sm text-muted">{submission.users?.email}</div>
          </div>
          <div><StatusBadge status={submission.status} /></div>
          {submission.submitted_at && (
            <div className="text-sm text-muted">Submitted: {new Date(submission.submitted_at).toLocaleString()}</div>
          )}
        </div>

        {/* Per-question breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(submission.submission_answers || []).sort((a, b) => (a.questions?.position ?? 0) - (b.questions?.position ?? 0)).map((ans, i) => (
            <div key={ans.id} className="card">
              <div className="flex-between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div className="flex-gap">
                  <span className="text-muted text-sm">Q{i + 1}</span>
                  <DifficultyBadge difficulty={ans.questions?.difficulty} />
                  <span className="badge badge-neutral">{ans.questions?.points ?? 1} pts</span>
                  {ans.questions?.partial_grading && (
                    <span className="badge badge-info" style={{ marginLeft: 6 }}>Partial</span>
                  )}
                </div>
                {ans.is_correct !== null && (
                  (typeof ans.score === 'number') ? (
                    ans.score > 0 ? (
                      <span className="flex-gap" style={{ color: 'var(--success)' }}><CheckCircle size={16}/> +{ans.score}</span>
                    ) : (
                      <span className="flex-gap" style={{ color: 'var(--danger)' }}><XCircle size={16}/> 0</span>
                    )
                  ) : null
                )}
              </div>
              <p style={{ fontWeight: 500, marginBottom: 16 }}>{ans.questions?.prompt}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <p className="text-xs text-muted" style={{ marginBottom: 6 }}>STUDENT QUERY</p>
                  <pre style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 'var(--radius-md)', fontSize: '0.8rem', overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono, monospace' }}>
                    {ans.query_text || '(no answer)'}
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-muted" style={{ marginBottom: 6 }}>STUDENT OUTPUT</p>
                  <OutputTable rows={ans.actual_output} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <p className="text-xs text-muted" style={{ marginBottom: 6 }}>EXPECTED OUTPUT</p>
                <OutputTable rows={ans.questions?.expected_output} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
