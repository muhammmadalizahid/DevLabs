'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import SQLEditor from '@/components/SQLEditor';
import OutputTable from '@/components/OutputTable';
import { DifficultyBadge } from '@/components/Badge';
import { useUIFeedback } from '@/components/UIFeedback';
import { getPersistentCache, setPersistentCache } from '@/lib/browser/persistentCache';
import { Play, Send, Clock } from 'lucide-react';

const TEST_DATASET_PREVIEW_TTL_MS = 12 * 60 * 60 * 1000

export default function TestAttemptPage() {
  const { id } = useParams();
  const router = useRouter();
  const { loading } = useRequireRole('student');
  const { notify, confirmAction } = useUIFeedback();
  const [test, setTest] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [activeQ, setActiveQ] = useState(0);
  const [queries, setQueries] = useState({});
  const [results, setResults] = useState({});
  const [datasetPreviews, setDatasetPreviews] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeDatasetId, setActiveDatasetId] = useState('');
  const [tablePreviewLoading, setTablePreviewLoading] = useState({});
  const [tablePages, setTablePages] = useState({});
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

    setPreviewLoading(true);
    try {
      const cacheKey = `student:test:${id}:datasets`;
      const cached = await getPersistentCache(cacheKey);
      if (cached?.datasets?.length) {
        setDatasetPreviews(cached.datasets);
        if (cached.datasets[0]?.id) setActiveDatasetId(cached.datasets[0].id);
        setPreviewLoading(false);
      }

      const dsRes = await fetch(`/api/tests/${id}/datasets`);
      if (dsRes.ok) {
        const dsData = await dsRes.json();
        const list = dsData.datasets || [];
        setDatasetPreviews(list);
        if (list[0]?.id) setActiveDatasetId(list[0].id);
        await setPersistentCache(cacheKey, { datasets: list }, TEST_DATASET_PREVIEW_TTL_MS);
      }
    } finally {
      setPreviewLoading(false);
    }

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

  async function loadTablePreview(datasetId, tableName) {
    return loadTablePreviewPage(datasetId, tableName, 1);
  }

  async function loadTablePreviewPage(datasetId, tableName, page = 1) {
    const key = `${datasetId}:${tableName}`;
    setTablePreviewLoading((prev) => ({ ...prev, [key]: true }));
    const res = await fetch(`/api/tests/${id}/datasets?datasetId=${encodeURIComponent(datasetId)}&table=${encodeURIComponent(tableName)}&page=${page}&limit=10`);
    if (res.ok) {
      const payload = await res.json();
      const table = payload.table;
      let nextDatasets = [];
      setDatasetPreviews((prev) => {
        nextDatasets = prev.map((dataset) => (
          dataset.id !== datasetId
            ? dataset
            : {
                ...dataset,
                tables: (dataset.tables || []).map((t) => t.table === tableName ? table : t),
              }
        ));
        return nextDatasets;
      });
      setTablePages((prev) => ({ ...prev, [key]: page }));
      const cacheKey = `student:test:${id}:datasets`;
      await setPersistentCache(cacheKey, { datasets: nextDatasets }, TEST_DATASET_PREVIEW_TTL_MS);
    }
    setTablePreviewLoading((prev) => ({ ...prev, [key]: false }));
  }

  async function handleSubmit(subId) {
    const confirmed = await confirmAction({
      title: 'Submit test?',
      message: 'You cannot make changes after submitting. Make sure your answers are saved before continuing.',
      confirmLabel: 'Submit test',
      variant: 'primary',
    });
    if (!confirmed) return;
    setSubmitting(true);
    const submissionId = subId || submission?.id;
    if (!submissionId) {
      setSubmitting(false);
      return;
    }

    for (const question of questions) {
      const queryText = queries[question.id] || '';
      if (!queryText.trim()) continue;
      const saveRes = await fetch(`/api/submissions/${submissionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: question.id, query_text: queryText }),
      });
      if (!saveRes.ok) {
        const data = await saveRes.json().catch(() => ({}));
        notify(data.error || 'Failed to save your answer before submitting.', {
          type: 'danger',
          title: 'Save failed',
        });
        setSubmitting(false);
        return;
      }
    }

    const res = await fetch(`/api/submissions/${submissionId}/submit`, { method: 'POST' });
    if (res.ok) router.replace(`/student/results/${id}`);
    else {
      const data = await res.json().catch(() => ({}));
      notify(data.error || 'Failed to submit test.', {
        type: 'danger',
        title: 'Submit failed',
      });
    }
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
  const selectedDataset = datasetPreviews.find((d) => d.id === (currentQ?.dataset_id || activeDatasetId)) || datasetPreviews[0];

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

              <div className="card">
                <div className="flex-between" style={{ marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Dataset Tables</h3>
                  {datasetPreviews.length > 1 && (
                    <select
                      className="form-input"
                      style={{ width: 260 }}
                      value={selectedDataset?.id || ''}
                      onChange={(e) => setActiveDatasetId(e.target.value)}
                    >
                      {datasetPreviews.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                </div>

                {previewLoading ? (
                  <p className="text-sm text-muted">Loading dataset preview...</p>
                ) : !selectedDataset ? (
                  <p className="text-sm text-muted">No dataset preview available for this test.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p className="text-sm text-muted" style={{ margin: 0 }}>
                      {selectedDataset.name}{selectedDataset.description ? ` - ${selectedDataset.description}` : ''}
                    </p>
                    {(selectedDataset.tables || []).length === 0 ? (
                      <p className="text-sm text-muted">No tables found in this dataset.</p>
                    ) : (
                      selectedDataset.tables.map((t) => (
                        <div key={t.table} className="card" style={{ padding: 12 }}>
                          <div className="flex-between" style={{ marginBottom: 8 }}>
                            <strong>{t.table}</strong>
                            <span className="badge badge-info">{t.row_count} rows</span>
                          </div>
                        <div className="text-xs text-muted" style={{ marginBottom: 8 }}>
                          Page {t.page || tablePages[`${selectedDataset.id}:${t.table}`] || 1}, showing up to {t.preview_limit} rows
                        </div>
                        <div style={{ marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {(!t.preview_rows || t.preview_rows.length === 0) && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => loadTablePreview(selectedDataset.id, t.table)}
                              disabled={!!tablePreviewLoading[`${selectedDataset.id}:${t.table}`]}
                            >
                              {tablePreviewLoading[`${selectedDataset.id}:${t.table}`] ? 'Loading rows...' : 'Load Sample Rows'}
                            </button>
                          )}
                          {!!t.preview_rows?.length && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => loadTablePreviewPage(selectedDataset.id, t.table, Math.max(1, (t.page || 1) - 1))}
                                disabled={!!tablePreviewLoading[`${selectedDataset.id}:${t.table}`] || (t.page || 1) <= 1}
                              >
                                Prev Page
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => loadTablePreviewPage(selectedDataset.id, t.table, (t.page || 1) + 1)}
                                disabled={!!tablePreviewLoading[`${selectedDataset.id}:${t.table}`] || !t.has_more}
                              >
                                Next Page
                              </button>
                            </>
                          )}
                        </div>
                        <div className="table-wrap">
                          <table>
                              <thead>
                                <tr>
                                  {(t.columns || []).map((c) => (
                                    <th key={`${t.table}:head:${c.name}`}>{c.name}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {(t.preview_rows || []).length === 0 ? (
                                  <tr>
                                    <td colSpan={(t.columns || []).length || 1} style={{ textAlign: 'center' }}>Rows not loaded</td>
                                  </tr>
                                ) : (
                                  (t.preview_rows || []).map((r, idx) => (
                                    <tr key={`${t.table}:row:${idx}`}>
                                      {(t.columns || []).map((c) => (
                                        <td key={`${t.table}:row:${idx}:${c.name}`}>{r?.[c.name] === null ? 'NULL' : String(r?.[c.name] ?? '')}</td>
                                      ))}
                                    </tr>
                                  ))
                                )}
                              </tbody>
                          </table>
                          </div>
                          <div className="text-xs text-muted" style={{ marginTop: 8 }}>
                            Estimated table size: {Number(t.table_size_estimate || 0).toLocaleString()} bytes
                            {t.last_refreshed_at ? ` • Cached ${new Date(t.last_refreshed_at).toLocaleString()}` : ''}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

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
