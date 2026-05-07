'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import SQLEditor from '@/components/SQLEditor';
import OutputTable from '@/components/OutputTable';
import { DifficultyBadge } from '@/components/Badge';
import { Play, Send, Clock } from 'lucide-react';

export default function TestAttemptPage() {
  const { id } = useParams();
  const router = useRouter();
  const { loading } = useRequireRole('student');
  const [test, setTest] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [activeQ, setActiveQ] = useState(0);
  const [queries, setQueries] = useState({});
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!loading && id) init();
    return () => clearInterval(timerRef.current);
  }, [loading, id]);

  async function init() {
    const testRes = await fetch(`/api/tests/${id}`);
    if (!testRes.ok) return;
    const testData = await testRes.json();
    setTest(testData);

    const subRes = await fetch(`/api/tests/${id}/attempt`, { method: 'POST' });
    if (!subRes.ok) return;
    const sub = await subRes.json();
    setSubmission(sub);

    if (sub.status === 'submitted') { router.replace(`/student/results/${id}`); return; }

    // Start timer
    if (testData.time_limit_mins) {
      const elapsed = Math.floor((Date.now() - new Date(sub.started_at).getTime()) / 1000);
      const total = testData.time_limit_mins * 60;
      let remaining = Math.max(0, total - elapsed);
      setTimeLeft(remaining);
      timerRef.current = setInterval(() => {
        remaining--;
        setTimeLeft(remaining);
        if (remaining <= 0) { clearInterval(timerRef.current); handleSubmit(sub.id); }
      }, 1000);
    }
  }

  async function runQuery(question) {
    const q = queries[question.id] || '';
    if (!q.trim() || !question.dataset_id) return;
    setRunning(true);
    const res = await fetch('/api/engine/run', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, dataset_id: question.dataset_id }),
    });
    const data = await res.json();
    setResults(r => ({ ...r, [question.id]: data }));
    // Auto-save answer
    await fetch(`/api/submissions/${submission.id}/answer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: question.id, query_text: q }),
    });
    setRunning(false);
  }

  async function handleSubmit(subId) {
    if (!confirm('Submit your test? You cannot make changes after submitting.')) return;
    setSubmitting(true);
    const res = await fetch(`/api/submissions/${subId || submission?.id}/submit`, { method: 'POST' });
    if (res.ok) router.replace(`/student/results/${id}`);
    setSubmitting(false);
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  if (loading || !test) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;

  const questions = test.questions || [];
  const currentQ = questions[activeQ];

  return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        <Navbar
          title={test.title}
          actions={<>
            {timeLeft !== null && (
              <span className={`flex-gap badge ${timeLeft < 120 ? 'badge-danger' : 'badge-info'}`}>
                <Clock size={14}/> {formatTime(timeLeft)}
              </span>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => handleSubmit()} disabled={submitting}>
              <Send size={14}/> {submitting ? 'Submitting…' : 'Submit Test'}
            </button>
          </>}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
          {/* Question navigator */}
          <div className="card" style={{ padding: 16, alignSelf: 'start', position: 'sticky', top: 'calc(var(--navbar-height) + 24px)' }}>
            <p className="text-xs text-muted" style={{ marginBottom: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Questions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {questions.map((q, i) => (
                <button key={q.id}
                  className={`btn btn-sm ${activeQ === i ? 'btn-primary' : queries[q.id] ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{ justifyContent: 'flex-start', gap: 8 }}
                  onClick={() => setActiveQ(i)}
                >
                  <span>Q{i + 1}</span>
                  <DifficultyBadge difficulty={q.difficulty} />
                </button>
              ))}
            </div>
            <div className="divider" />
            <p className="text-xs text-muted">{Object.keys(queries).length} / {questions.length} answered</p>
          </div>

          {/* Active question */}
          {currentQ && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <div className="flex-gap" style={{ marginBottom: 10 }}>
                  <span className="text-muted text-sm">Question {activeQ + 1}</span>
                  <DifficultyBadge difficulty={currentQ.difficulty} />
                  <span className="badge badge-neutral">{currentQ.points} pt{currentQ.points !== 1 ? 's' : ''}</span>
                </div>
                <p style={{ fontWeight: 500, fontSize: '1rem', color: 'var(--text-primary)' }}>{currentQ.prompt}</p>
              </div>

              <SQLEditor
                value={queries[currentQ.id] || ''}
                onChange={v => setQueries(q => ({ ...q, [currentQ.id]: v || '' }))}
                height={280}
              />

              <div className="flex-gap">
                <button className="btn btn-secondary" onClick={() => runQuery(currentQ)} disabled={running || !currentQ.dataset_id}>
                  <Play size={16}/> {running ? 'Running…' : 'Run Query'}
                </button>
                {!currentQ.dataset_id && <span className="text-sm text-muted">No dataset assigned to this question</span>}
              </div>

              {results[currentQ.id] && (
                <OutputTable rows={results[currentQ.id].rows} columns={results[currentQ.id].columns} error={results[currentQ.id].error} />
              )}

              <div className="flex-between">
                <button className="btn btn-secondary" disabled={activeQ === 0} onClick={() => setActiveQ(i => i - 1)}>← Prev</button>
                <button className="btn btn-secondary" disabled={activeQ === questions.length - 1} onClick={() => setActiveQ(i => i + 1)}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
