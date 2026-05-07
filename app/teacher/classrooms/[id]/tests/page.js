'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { DifficultyBadge, StatusBadge } from '@/components/Badge';
import { Plus, FlaskConical, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

export default function TestsPage() {
  const { id } = useParams();
  const { loading } = useRequireRole('teacher');
  const [tests, setTests] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', time_limit_mins: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!loading && id) fetchTests(); }, [loading, id]);

  async function fetchTests() {
    setFetching(true);
    const res = await fetch(`/api/tests?classroomId=${id}`);
    if (res.ok) setTests(await res.json());
    setFetching(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setCreating(true); setError('');
    const res = await fetch('/api/tests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, classroom_id: id, time_limit_mins: form.time_limit_mins ? parseInt(form.time_limit_mins) : null }),
    });
    const data = await res.json();
    if (res.ok) { setTests(t => [data, ...t]); setShowCreate(false); setForm({ title: '', description: '', time_limit_mins: '' }); }
    else setError(data.error);
    setCreating(false);
  }

  async function togglePublish(test) {
    const res = await fetch(`/api/tests/${test.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published: !test.is_published }),
    });
    if (res.ok) setTests(ts => ts.map(t => t.id === test.id ? { ...t, is_published: !t.is_published } : t));
  }

  async function deleteTest(testId) {
    if (!confirm('Delete this test? This cannot be undone.')) return;
    await fetch(`/api/tests/${testId}`, { method: 'DELETE' });
    setTests(ts => ts.filter(t => t.id !== testId));
  }

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="page-layout">
      <Sidebar classroomId={id} />
      <div className="page-content">
        <Navbar title="Tests" actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={16}/> New Test</button>
        } />

        {fetching ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : tests.length === 0 ? (
          <div className="card empty-state">
            <FlaskConical size={40} />
            <h3>No tests yet</h3>
            <p>Create your first test to get started</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}><Plus size={16}/> New Test</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tests.map(test => (
              <div key={test.id} className="card flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div className="flex-gap" style={{ marginBottom: 6 }}>
                    <h3>{test.title}</h3>
                    <StatusBadge status={test.is_published ? 'published' : 'draft'} />
                  </div>
                  <div className="flex-gap">
                    <span className="text-sm text-muted">{test.questions?.[0]?.count ?? 0} questions</span>
                    {test.time_limit_mins && <span className="text-sm text-muted">· {test.time_limit_mins} min</span>}
                    <span className="text-xs text-muted">{new Date(test.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex-gap">
                  <button className="btn btn-secondary btn-sm" onClick={() => togglePublish(test)}>
                    {test.is_published ? <><EyeOff size={14}/> Unpublish</> : <><Eye size={14}/> Publish</>}
                  </button>
                  <a href={`/teacher/tests/${test.id}/edit`} className="btn btn-secondary btn-sm"><Edit size={14}/> Edit</a>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteTest(test.id)}><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setError(''); }} title="Create Test"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating…' : 'Create Test'}</button>
        </>}
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Test Title *</label>
            <input id="test-title" className="form-input" placeholder="e.g. Midterm SQL Exam"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} placeholder="Instructions for students"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Time Limit (minutes)</label>
            <input className="form-input" type="number" min={1} max={300} placeholder="Leave blank for no limit"
              value={form.time_limit_mins} onChange={e => setForm(f => ({ ...f, time_limit_mins: e.target.value }))} />
          </div>
          {error && <p className="form-error">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
