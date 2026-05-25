'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import SQLEditor from '@/components/SQLEditor';
import OutputTable from '@/components/OutputTable';
import { DifficultyBadge } from '@/components/Badge';
import { Plus, Trash2, Play, Save } from 'lucide-react';

export default function TestEditPage() {
  const { id } = useParams();
  const { loading } = useRequireRole('teacher');
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [qForm, setQForm] = useState({ prompt: '', difficulty: 'basic', dataset_id: '', order_sensitive: false, points: 1, expected_query: '' });
  const [refResult, setRefResult] = useState(null);
  const [runningRef, setRunningRef] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && id) { fetchTest(); fetchDatasets(); }
  }, [loading, id]);

  async function fetchTest() {
    const res = await fetch(`/api/tests/${id}`);
    if (res.ok) { const d = await res.json(); setTest(d); setQuestions(d.questions || []); }
  }

  async function fetchDatasets() {
    const res = await fetch('/api/datasets');
    if (res.ok) setDatasets(await res.json());
  }

  async function runReference() {
    if (!qForm.expected_query.trim() || !qForm.dataset_id) return;
    setRunningRef(true); setRefResult(null);
    const res = await fetch('/api/engine/run', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: qForm.expected_query, dataset_id: qForm.dataset_id }),
    });
    const data = await res.json();
    setRefResult(data); setRunningRef(false);
  }

  async function addQuestion() {
    if (!qForm.prompt.trim()) { setError('Question prompt is required'); return; }
    if (!Array.isArray(refResult?.rows)) { setError('Run the reference query first to set the expected output'); return; }
    setSaving(true); setError('');
    const res = await fetch(`/api/tests/${id}/questions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: qForm.prompt, difficulty: qForm.difficulty, dataset_id: qForm.dataset_id || null,
        expected_output: refResult.rows, order_sensitive: qForm.order_sensitive, points: parseInt(qForm.points),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setQuestions(qs => [...qs, data]);
      setShowAdd(false);
      setQForm({ prompt: '', difficulty: 'basic', dataset_id: '', order_sensitive: false, points: 1, expected_query: '' });
      setRefResult(null);
    } else setError(data.error);
    setSaving(false);
  }

  async function deleteQuestion(qid) {
    if (!confirm('Remove this question?')) return;
    await fetch(`/api/tests/${id}/questions/${qid}`, { method: 'DELETE' });
    setQuestions(qs => qs.filter(q => q.id !== qid));
  }

  if (loading || !test) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="page-layout">
      <Sidebar classroomId={test.classroom_id} />
      <div className="page-content">
        <Navbar title={`Edit: ${test.title}`} actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={16}/> Add Question</button>
        } />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {questions.length === 0 && (
            <div className="card empty-state">
              <h3>No questions yet</h3>
              <p>Add questions to build your test</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}><Plus size={16}/> Add Question</button>
            </div>
          )}
          {questions.map((q, i) => (
            <div key={q.id} className="card flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div className="flex-gap" style={{ marginBottom: 6 }}>
                  <span className="text-muted text-sm">Q{i + 1}</span>
                  <DifficultyBadge difficulty={q.difficulty} />
                  <span className="badge badge-neutral">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                    <input type="checkbox" checked={q.partial_grading} onChange={async (e) => {
                      const enabled = e.target.checked;
                      // Optimistic UI
                      setQuestions(prev => prev.map(p => p.id === q.id ? { ...p, partial_grading: enabled } : p));
                      const res = await fetch(`/api/tests/${id}/questions/${q.id}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partial_grading: enabled })
                      });
                      if (!res.ok) {
                        const data = await res.json();
                        alert('Failed to update: ' + (data?.error || res.statusText));
                        // revert
                        setQuestions(prev => prev.map(p => p.id === q.id ? { ...p, partial_grading: !enabled } : p));
                      }
                    }} />
                    <span className="text-xs text-muted">Partial</span>
                  </label>
                </div>
                <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{q.prompt}</p>
                <p className="text-xs text-muted" style={{ marginTop: 4 }}>{(q.expected_output || []).length} expected rows</p>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => deleteQuestion(q.id)}><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setError(''); setRefResult(null); }}
        title="Add Question" maxWidth={680}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={addQuestion} disabled={saving}>{saving ? 'Saving…' : <><Save size={14}/> Save Question</>}</button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Question Prompt *</label>
            <textarea className="form-input" rows={3} placeholder="e.g. Write a query to find all employees with salary > 50000"
              value={qForm.prompt} onChange={e => setQForm(f => ({ ...f, prompt: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select className="form-input" value={qForm.difficulty} onChange={e => setQForm(f => ({ ...f, difficulty: e.target.value }))}>
                <option value="basic">Basic</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Points</label>
              <input className="form-input" type="number" min={1} value={qForm.points} onChange={e => setQForm(f => ({ ...f, points: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Dataset *</label>
              <select className="form-input" value={qForm.dataset_id} onChange={e => setQForm(f => ({ ...f, dataset_id: e.target.value }))}>
                <option value="">Select dataset</option>
                {datasets.map(d => <option key={d.id} value={d.id}>{d.is_platform ? '🌐 ' : '📁 '}{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reference Query (sets expected output)</label>
            <SQLEditor value={qForm.expected_query} onChange={v => setQForm(f => ({ ...f, expected_query: v || '' }))} height={180} />
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={runReference} disabled={runningRef || !qForm.dataset_id}>
              <Play size={14}/> {runningRef ? 'Running…' : 'Run to set expected output'}
            </button>
          </div>
          {refResult && <OutputTable rows={refResult.rows} columns={refResult.columns} error={refResult.error} />}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
            <input type="checkbox" checked={qForm.order_sensitive} onChange={e => setQForm(f => ({ ...f, order_sensitive: e.target.checked }))} />
            Order-sensitive comparison
          </label>
          {error && <p className="form-error">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
