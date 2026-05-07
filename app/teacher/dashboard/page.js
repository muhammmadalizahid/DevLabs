'use client';
import { useState, useEffect } from 'react';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { Plus, Users, FlaskConical, Copy, Check } from 'lucide-react';

export default function TeacherDashboard() {
  const { session, loading } = useRequireRole('teacher');
  const [classrooms, setClassrooms] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', email_domain: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (!loading) fetchClassrooms();
  }, [loading]);

  async function fetchClassrooms() {
    setFetching(true);
    const res = await fetch('/api/classrooms');
    if (res.ok) setClassrooms(await res.json());
    setFetching(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Classroom name is required'); return; }
    setCreating(true); setError('');
    const res = await fetch('/api/classrooms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setClassrooms(c => [data, ...c]);
      setShowCreate(false);
      setForm({ name: '', description: '', email_domain: '' });
    } else setError(data.error);
    setCreating(false);
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        <Navbar title="My Classrooms" actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Classroom
          </button>
        } />

        {/* Stats */}
        <div className="grid-3" style={{ marginBottom: 28 }}>
          <div className="stat-card"><div className="stat-value">{classrooms.length}</div><div className="stat-label">Classrooms</div></div>
          <div className="stat-card"><div className="stat-value">{classrooms.reduce((s, c) => s + (c.enrollments?.[0]?.count ?? 0), 0)}</div><div className="stat-label">Total Students</div></div>
          <div className="stat-card"><div className="stat-value">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div><div className="stat-label">Today</div></div>
        </div>

        {/* Classroom cards */}
        {fetching ? (
          <div className="grid-2">{[1,2,3].map(i => <div key={i} className="card"><div className="skeleton" style={{ height: 120 }} /></div>)}</div>
        ) : classrooms.length === 0 ? (
          <div className="card empty-state">
            <Users size={48} />
            <h3>No classrooms yet</h3>
            <p>Create your first classroom to get started</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Create Classroom
            </button>
          </div>
        ) : (
          <div className="grid-2">
            {classrooms.map(c => (
              <div key={c.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="flex-between">
                  <h3 className="truncate">{c.name}</h3>
                  <button className="btn btn-ghost btn-icon" title="Copy invite code" onClick={() => copyCode(c.invite_code)}>
                    {copied === c.invite_code ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                  </button>
                </div>
                {c.description && <p className="text-sm">{c.description}</p>}
                <div className="flex-gap">
                  <span className="badge badge-info">{c.invite_code}</span>
                  {c.email_domain && <span className="badge badge-neutral">{c.email_domain}</span>}
                </div>
                <div className="flex-gap" style={{ marginTop: 'auto' }}>
                  <a href={`/teacher/classrooms/${c.id}`} className="btn btn-secondary btn-sm"><Users size={14}/> Students</a>
                  <a href={`/teacher/classrooms/${c.id}/tests`} className="btn btn-secondary btn-sm"><FlaskConical size={14}/> Tests</a>
                  <a href={`/teacher/classrooms/${c.id}/results`} className="btn btn-secondary btn-sm">Results</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Classroom Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setError(''); }}
        title="Create Classroom"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Create Classroom'}
          </button>
        </>}
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Classroom Name *</label>
            <input id="classroom-name" className="form-input" placeholder="e.g. Database Systems — Fall 2026"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" placeholder="Optional description" rows={2}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Email Domain Restriction</label>
            <input className="form-input" placeholder="e.g. @student.uet.edu.pk (optional)"
              value={form.email_domain} onChange={e => setForm(f => ({ ...f, email_domain: e.target.value }))} />
            <span className="form-hint">Leave blank to allow any email address</span>
          </div>
          {error && <p className="form-error">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
