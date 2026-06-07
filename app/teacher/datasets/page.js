'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { useUIFeedback } from '@/components/UIFeedback';
import { deletePersistentCache, getPersistentCache, setPersistentCache } from '@/lib/browser/persistentCache';
import { Plus, Database, Trash2, Eye } from 'lucide-react';

const DATASET_LIST_CACHE_KEY = 'teacher:datasets:list'
const DATASET_LIST_TTL_MS = 5 * 60 * 1000
const DATASET_DETAIL_TTL_MS = 12 * 60 * 60 * 1000

function normalizeDatasetStatus(dataset) {
  const status = dataset?.status || 'READY'
  if (status !== 'PROCESSING') return status
  if ((dataset?.table_count || 0) > 0) return 'READY'
  if ((dataset?.row_count || 0) > 0) return 'READY'
  if ((dataset?.tables || []).length > 0) return 'READY'
  return status
}

function normalizeDatasetPayload(dataset) {
  if (!dataset) return dataset
  return {
    ...dataset,
    status: normalizeDatasetStatus(dataset),
  }
}

export default function DatasetsPage() {
  const { loading } = useRequireRole('teacher');
  const { notify, confirmAction } = useUIFeedback();
  const [datasets, setDatasets] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [tablePreviewLoading, setTablePreviewLoading] = useState({});
  const [tablePages, setTablePages] = useState({});
  const [form, setForm] = useState({ name: '', description: '', sql_script: '' });
  const [uploading, setUploading] = useState(false);
  const uploadAbortRef = useRef(null)
  const [error, setError] = useState('');

  const fetchDatasets = useCallback(async (background = false) => {
    if (!background) {
      setFetching(true);
      const cached = await getPersistentCache(DATASET_LIST_CACHE_KEY);
      if (cached?.items?.length) {
        setDatasets((cached.items || []).map(normalizeDatasetPayload));
        setFetching(false);
      }
    }

    const res = await fetch('/api/datasets');
    if (res.ok) {
      const items = (await res.json()).map(normalizeDatasetPayload);
      setDatasets(items);
      await setPersistentCache(DATASET_LIST_CACHE_KEY, { items }, DATASET_LIST_TTL_MS);
    }
    if (!background) setFetching(false);
  }, []);

  const fetchDatasetDetail = useCallback(async (id, { useCache = true, showLoading = true } = {}) => {
    if (!id) return null
    const cacheKey = `teacher:dataset:${id}`
    if (showLoading) setViewLoading(true)

    if (useCache) {
      const cached = await getPersistentCache(cacheKey);
      if (cached) {
        setSelectedDataset(normalizeDatasetPayload(cached));
        if (showLoading) setViewLoading(false)
      } else if (showLoading) {
        setSelectedDataset(null)
      }
    }

    const res = await fetch(`/api/datasets/${id}`)
    if (!res.ok) {
      if (showLoading) setViewLoading(false)
      return null
    }

    const dataset = normalizeDatasetPayload(await res.json())
    setSelectedDataset(dataset)
    await setPersistentCache(cacheKey, dataset, DATASET_DETAIL_TTL_MS)
    if (showLoading) setViewLoading(false)
    return dataset
  }, [])

  useEffect(() => { if (!loading) fetchDatasets(); }, [loading, fetchDatasets]);

  useEffect(() => {
    if (loading) return
    const hasProcessing = datasets.some((dataset) => dataset.status === 'PROCESSING')
    if (!hasProcessing) return
    const timer = setInterval(() => {
      fetchDatasets(true)
    }, 4000)
    return () => clearInterval(timer)
  }, [datasets, loading, fetchDatasets])

  useEffect(() => {
    if (!showView || !selectedDataset?.id || selectedDataset.status !== 'PROCESSING') return
    const timer = setInterval(() => {
      fetchDatasetDetail(selectedDataset.id, { useCache: false, showLoading: false })
    }, 4000)
    return () => clearInterval(timer)
  }, [showView, selectedDataset?.id, selectedDataset?.status, fetchDatasetDetail])

  async function handleUpload(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Dataset name is required'); return; }
    if (!form.sql_script.trim()) { setError('SQL script is required'); return; }
    setUploading(true); setError('');
    const controller = new AbortController()
    uploadAbortRef.current = controller
    const payload = { name: form.name, description: form.description, sql_script: form.sql_script };
    try {
      const res = await fetch('/api/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await res.json();
      if (res.ok) {
        const next = [data, ...datasets];
        setDatasets(next);
        await setPersistentCache(DATASET_LIST_CACHE_KEY, { items: next }, DATASET_LIST_TTL_MS);
        setShowUpload(false);
        setForm({ name: '', description: '', sql_script: '' });
      } else {
        setError(data.error || 'Dataset upload failed.');
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        setError('Upload cancelled. Refreshing dataset list to confirm final SQL engine state...')
        await fetchDatasets()
      } else {
        setError(err?.message || 'Dataset upload failed.')
      }
    } finally {
      uploadAbortRef.current = null
      setUploading(false);
    }
  }

  function cancelUploadFlow() {
    if (uploading && uploadAbortRef.current) {
      uploadAbortRef.current.abort()
      return
    }
    setShowUpload(false)
    setError('')
  }

  async function deleteDataset(id) {
    const confirmed = await confirmAction({
      title: 'Delete dataset?',
      message: 'This will also remove dataset tables from the SQL engine. Tests using this dataset may stop working.',
      confirmLabel: 'Delete dataset',
      variant: 'danger',
    });
    if (!confirmed) return;
    const res = await fetch(`/api/datasets/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      notify(data.error || 'Failed to delete dataset.', { type: 'danger', title: 'Delete failed' });
      return;
    }
    const next = datasets.filter(ds => ds.id !== id);
    setDatasets(next);
    await setPersistentCache(DATASET_LIST_CACHE_KEY, { items: next }, DATASET_LIST_TTL_MS);
    await deletePersistentCache(`teacher:dataset:${id}`);
    notify('The dataset was deleted.', { type: 'success', title: 'Deleted' });
  }

  async function viewDataset(id) {
    setShowView(true);
    await fetchDatasetDetail(id, { useCache: true, showLoading: true });
  }

  async function loadSqlSource(datasetId) {
    if (!datasetId) return;
    setSqlLoading(true);
    const res = await fetch(`/api/datasets/${datasetId}?includeSql=1`);
    if (res.ok) {
      const full = await res.json();
      const next = normalizeDatasetPayload({ ...(selectedDataset || {}), ...full });
      setSelectedDataset(next);
      await setPersistentCache(`teacher:dataset:${datasetId}`, next, DATASET_DETAIL_TTL_MS);
    }
    setSqlLoading(false);
  }

  async function loadTablePreview(datasetId, tableName) {
    return loadTablePreviewPage(datasetId, tableName, 1);
  }

  async function loadTablePreviewPage(datasetId, tableName, page = 1) {
    const key = `${datasetId}:${tableName}`;
    setTablePreviewLoading((prev) => ({ ...prev, [key]: true }));
    const res = await fetch(`/api/datasets/${datasetId}?table=${encodeURIComponent(tableName)}&page=${page}&limit=10`);
    if (res.ok) {
      const payload = await res.json();
      const table = payload.table;
      let nextDataset = null;
      setSelectedDataset((prev) => {
        nextDataset = normalizeDatasetPayload({
          ...prev,
          tables: (prev?.tables || []).map((t) => t.table === tableName ? table : t),
        });
        return nextDataset;
      });
      setTablePages((prev) => ({ ...prev, [key]: page }));
      if (nextDataset) {
        await setPersistentCache(`teacher:dataset:${datasetId}`, nextDataset, DATASET_DETAIL_TTL_MS);
      }
    }
    setTablePreviewLoading((prev) => ({ ...prev, [key]: false }));
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
                <div className="flex-gap">
                  <button className="btn btn-secondary btn-sm" onClick={() => viewDataset(d.id)}><Eye size={14}/> View</button>
                  {!d.is_platform && (
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteDataset(d.id)}><Trash2 size={14}/></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal open={showUpload} onClose={cancelUploadFlow} title="Upload Dataset" maxWidth={700} disableClose={uploading}
          footer={<>
            <button className="btn btn-secondary" onClick={cancelUploadFlow}>{uploading ? 'Abort Upload' : 'Cancel'}</button>
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
              <label className="form-label">SQL Script *</label>
              <textarea className="form-input mono" rows={12} placeholder="CREATE TABLE employees (...);&#10;INSERT INTO employees (...) VALUES (...);"
                value={form.sql_script} onChange={e => setForm(f => ({ ...f, sql_script: e.target.value }))} />
              <p className="text-sm text-muted" style={{ marginTop: 8 }}>
                Use one SQL script containing both schema and insert statements. The backend will split schema and seed automatically.
              </p>
            </div>
            {uploading && <p className="text-sm text-muted">⚙️ Creating dataset... converting to CSV and uploading to storage… this may take a moment.</p>}
            {error && <p className="form-error">{error}</p>}
          </div>
        </Modal>

        <Modal open={showView} onClose={() => setShowView(false)} title="Dataset Details" maxWidth={820}
          footer={<button className="btn btn-secondary" onClick={() => setShowView(false)}>Close</button>}
        >
          {viewLoading ? (
            <div className="flex-center" style={{ minHeight: 120 }}><div className="spinner" /></div>
          ) : !selectedDataset ? (
            <p className="text-sm text-muted">Unable to load dataset details.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <h3 style={{ marginBottom: 4 }}>{selectedDataset.name}</h3>
                <p className="text-sm text-muted">{selectedDataset.description || 'No description provided.'}</p>
              </div>
              <div className="flex-gap" style={{ flexWrap: 'wrap' }}>
                <span className="badge badge-neutral">{selectedDataset.is_platform ? 'Platform' : 'Custom'}</span>
                <span className="badge badge-info">Created: {new Date(selectedDataset.created_at).toLocaleDateString()}</span>
                <span className="badge badge-info">{selectedDataset.table_count || selectedDataset.tables?.length || 0} tables</span>
                <span className={`badge ${selectedDataset.status === 'READY' ? 'badge-success' : selectedDataset.status === 'FAILED' ? 'badge-danger' : 'badge-info'}`}>
                  {selectedDataset.status || 'UNKNOWN'}
                </span>
              </div>
              {selectedDataset.status === 'PROCESSING' && (selectedDataset.table_count || 0) === 0 && (selectedDataset.tables || []).length === 0 && (
                <p className="text-sm text-muted">
                  Dataset provisioning is still running. This dialog will refresh automatically until metadata is ready.
                </p>
              )}
              {selectedDataset.status === 'FAILED' && selectedDataset.error_message && (
                <p className="form-error">{selectedDataset.error_message}</p>
              )}
              <div className="form-group">
                <div className="flex-between" style={{ marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>SQL Source</label>
                  {!selectedDataset.source_sql && (
                    <button className="btn btn-secondary btn-sm" onClick={() => loadSqlSource(selectedDataset.id)} disabled={sqlLoading}>
                      {sqlLoading ? 'Loading...' : 'Load SQL Source'}
                    </button>
                  )}
                </div>
                {selectedDataset.source_sql ? (
                  <textarea className="form-input mono" readOnly rows={14} value={selectedDataset.source_sql || ''} />
                ) : (
                  <p className="text-sm text-muted">SQL source is available on demand to keep large datasets fast.</p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Database Tables</label>
                {!selectedDataset.tables || selectedDataset.tables.length === 0 ? (
                  <p className="text-sm text-muted">No table structure could be inferred from schema.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedDataset.tables.map((t) => (
                      <div key={t.table} className="card" style={{ padding: 12 }}>
                        <div className="flex-between" style={{ marginBottom: 8 }}>
                          <strong>{t.table}</strong>
                          <span className="badge badge-info">{t.row_count} rows total</span>
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
                        <div className="table-wrap" style={{ marginBottom: 10 }}>
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
                        <div className="text-xs text-muted" style={{ marginBottom: 10 }}>
                          Estimated table size: {Number(t.table_size_estimate || 0).toLocaleString()} bytes
                          {t.last_refreshed_at ? ` • Cached ${new Date(t.last_refreshed_at).toLocaleString()}` : ''}
                        </div>
                        <details>
                          <summary className="text-xs text-muted" style={{ cursor: 'pointer', userSelect: 'none' }}>
                            Column metadata
                          </summary>
                          <div className="table-wrap" style={{ marginTop: 8 }}>
                            <table>
                              <thead>
                                <tr>
                                  <th>Column</th>
                                  <th>Type</th>
                                  <th>Nullable</th>
                                  <th>Primary Key</th>
                                  <th>Default</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(t.columns || []).map((c) => (
                                  <tr key={`${t.table}:meta:${c.name}`}>
                                    <td>{c.name}</td>
                                    <td>{c.type || 'TEXT'}</td>
                                    <td>{c.not_null ? 'No' : 'Yes'}</td>
                                    <td>{c.primary_key ? 'Yes' : 'No'}</td>
                                    <td>{c.default_value ?? 'NULL'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
