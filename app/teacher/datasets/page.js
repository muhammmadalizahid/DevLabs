'use client';
import { useState, useEffect } from 'react';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { Plus, Database, Trash2 } from 'lucide-react';

export default function DatasetsPage() {
  const { loading } = useRequireRole('teacher');
  const [datasets, setDatasets] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', schema_sql: '', seed_sql: '' });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!loading) fetchDatasets(); }, [loading]);

  async function fetchDatasets() {
    setFetching(true);
    const res = await fetch('/api/datasets');
    if (res.ok) setDatasets(await res.json());
    setFetching(false);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.schema_sql.trim()) { setError('Name and Schema SQL are required'); return; }
    setUploading(true); setError('');
    const res = await fetch('/api/datasets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) { setDatasets(d => [data, ...d]); setShowUpload(false); setForm({ name: '', description: '', schema_sql: '', seed_sql: '' }); }
    else setError(data.error);
    setUploading(false);
  }

  async function deleteDataset(id) {
    if (!confirm('Delete this dataset? This will also remove the sandbox database.')) return;
    await fetch(`/api/datasets/${id}`, { method: 'DELETE' });
    setDatasets(d => d.filter(ds => ds.id !== id));
  }

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        <Navbar title="Datasets" actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}><Plus size={16}/> Upload Dataset</button>
        } />

        {fetching ? (
          <div className="grid-2">{[1,2].map(i => <div key={i} className="card"><div className="skeleton" style={{ height: 90 }} /></div>)}</div>
        ) : (
          <div className="grid-2">
            {datasets.map(d => (
              <div key={d.id} className="card flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div className="flex-gap">
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: d.is_platform ? 'var(--teal-light)' : 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: d.is_platform ? 'var(--teal)' : 'var(--accent)' }}>
                    <Database size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{d.name}</div>
                    <div className="text-xs text-muted">{d.is_platform ? '🌐 Platform dataset' : '📁 Custom dataset'}</div>
                  </div>
                </div>
                {!d.is_platform && (
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteDataset(d.id)}><Trash2 size={14}/></button>
                )}
              </div>
            ))}
          </div>
        )}

        <Modal open={showUpload} onClose={() => { setShowUpload(false); setError(''); }} title="Upload Dataset" maxWidth={640}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>{uploading ? 'Provisioning…' : 'Upload & Provision'}</button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Dataset Name *</label>
              <input className="form-input" placeholder="e.g. Company HR Database"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Optional description"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Schema SQL * (CREATE TABLE statements)</label>
              <textarea className="form-input mono" rows={6} placeholder="CREATE TABLE employees (&#10;  id INT PRIMARY KEY,&#10;  name VARCHAR(100)&#10;);"
                value={form.schema_sql} onChange={e => setForm(f => ({ ...f, schema_sql: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Seed SQL (INSERT statements)</label>
              <textarea className="form-input mono" rows={5} placeholder="INSERT INTO employees VALUES (1, 'Alice');"
                value={form.seed_sql} onChange={e => setForm(f => ({ ...f, seed_sql: e.target.value }))} />
            </div>
            {uploading && <p className="text-sm text-muted">⚙️ Creating dataset... converting to CSV and uploading to storage… this may take a moment.</p>}
            {error && <p className="form-error">{error}</p>}
          </div>
        </Modal>
      </div>
    </div>
  );
}
