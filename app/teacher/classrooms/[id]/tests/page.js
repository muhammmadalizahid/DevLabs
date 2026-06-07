'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { StatusBadge } from '@/components/Badge';
import { useUIFeedback } from '@/components/UIFeedback';
import Link from 'next/link';
import { Plus, FlaskConical, Edit, Trash2, Eye, EyeOff, ChevronDown, Check } from 'lucide-react';

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

function ClassroomMultiSelect({ classrooms, selectedIds, onChange, lockedIds = [], hint }) {
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(selectedIds);
  const lockedSet = new Set(lockedIds);
  const selectedClassrooms = classrooms.filter((item) => selectedSet.has(item.id));
  const label = selectedClassrooms.length
    ? `${selectedClassrooms.length} classroom${selectedClassrooms.length === 1 ? '' : 's'} selected`
    : 'Select classrooms';

  function toggleClassroom(classroomId) {
    if (lockedSet.has(classroomId)) return;
    const next = new Set(selectedIds);
    if (next.has(classroomId)) next.delete(classroomId);
    else next.add(classroomId);
    lockedIds.forEach((lockedId) => next.add(lockedId));
    onChange(Array.from(next));
  }

  return (
    <div className="form-group">
      <label className="form-label">Classrooms</label>
      <div>
        <button
          type="button"
          className="form-input"
          onClick={() => setOpen((value) => !value)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textAlign: 'left',
            cursor: 'pointer',
            minHeight: 52,
          }}
        >
          <span className="truncate" style={{ paddingRight: 12 }}>{label}</span>
          <ChevronDown size={18} />
        </button>
        {open && (
          <div
            style={{
              marginTop: 8,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              maxHeight: 220,
              overflowY: 'auto',
              padding: 8,
            }}
          >
            {classrooms.map((item) => {
              const selected = selectedSet.has(item.id);
              const locked = lockedSet.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleClassroom(item.id)}
                  className="btn btn-ghost"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    gap: 10,
                    minHeight: 44,
                    borderRadius: 8,
                    opacity: locked ? 0.72 : 1,
                    cursor: locked ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                      background: selected ? 'var(--primary)' : 'transparent',
                      color: selected ? 'white' : 'transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} />
                  </span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.name}</span>
                  {locked && <span className="text-xs text-muted">Current</span>}
                </button>
              );
            })}
            {classrooms.length === 0 && (
              <div className="text-sm text-muted" style={{ padding: 10 }}>No classrooms available</div>
            )}
          </div>
        )}
      </div>
      {selectedClassrooms.length > 0 && (
        <div className="flex-gap" style={{ flexWrap: 'wrap', marginTop: 8 }}>
          {selectedClassrooms.map((item) => (
            <span key={item.id} className="badge badge-neutral">{item.name}</span>
          ))}
        </div>
      )}
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}

export default function TestsPage() {
  const { id } = useParams();
  const { loading } = useRequireRole('teacher');
  const { notify, confirmAction } = useUIFeedback();
  const [classroom, setClassroom] = useState(null);
  const [teacherClassrooms, setTeacherClassrooms] = useState([]);
  const [tests, setTests] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPublishHelp, setShowPublishHelp] = useState(false);
  const [publishBlockedTest, setPublishBlockedTest] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', time_limit_mins: '', due_at: '', classroom_ids: [] });
  const [editForm, setEditForm] = useState({ id: '', title: '', description: '', time_limit_mins: '', due_at: '', questionCount: 0, classroom_ids: [], current_classroom_id: '' });
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && id) {
      fetchClassroom();
      fetchTeacherClassrooms();
      fetchTests();
    }
  }, [loading, id]);

  async function fetchClassroom() {
    const res = await fetch(`/api/classrooms/${id}`);
    if (res.ok) setClassroom(await res.json());
  }

  async function fetchTeacherClassrooms() {
    const res = await fetch('/api/classrooms');
    if (res.ok) {
      const data = await res.json();
      setTeacherClassrooms(Array.isArray(data) ? data : []);
    }
  }

  function updateSelectedClassrooms(selectedValues, isEdit = false) {
    if (isEdit) {
      setEditForm((prev) => ({ ...prev, classroom_ids: selectedValues }));
      return;
    }
    setForm((prev) => ({ ...prev, classroom_ids: selectedValues }));
  }

  async function fetchTests() {
    setFetching(true);
    const res = await fetch(`/api/tests?classroomId=${id}`);
    if (res.ok) setTests(await res.json());
    setFetching(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.classroom_ids.length) { setError('Select at least one classroom'); return; }
    setCreating(true); setError('');
    const res = await fetch('/api/tests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        classroom_ids: form.classroom_ids,
        time_limit_mins: form.time_limit_mins ? parseInt(form.time_limit_mins, 10) : null,
        due_at: form.due_at || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      await fetchTests();
      setShowCreate(false);
      setForm({ title: '', description: '', time_limit_mins: '', due_at: '', classroom_ids: [id] });
      if ((data.created_tests || []).length > 1) {
        notify(`Created ${data.created_tests.length} classroom-specific test copies.`, {
          type: 'success',
          title: 'Tests created',
        });
      }
    } else setError(data.error);
    setCreating(false);
  }

  async function openEditTest(test) {
    setEditForm({
      id: test.id,
      title: test.title || '',
      description: test.description || '',
      time_limit_mins: test.time_limit_mins ? String(test.time_limit_mins) : '',
      due_at: test.due_at ? String(test.due_at).slice(0, 16) : '',
      questionCount: Number(test.questions?.[0]?.count ?? 0),
      classroom_ids: [test.classroom_id],
      current_classroom_id: test.classroom_id,
    });
    setError('');
    setShowEdit(true);

    const res = await fetch(`/api/tests/${test.id}`);
    if (!res.ok) return;
    const data = await res.json();
    const selectedClassroomIds = Array.isArray(data.clone_classroom_ids) && data.clone_classroom_ids.length
      ? data.clone_classroom_ids
      : [data.classroom_id || test.classroom_id];

    setEditForm((prev) => ({
      ...prev,
      id: data.id || prev.id,
      title: data.title || '',
      description: data.description || '',
      time_limit_mins: data.time_limit_mins ? String(data.time_limit_mins) : '',
      due_at: data.due_at ? String(data.due_at).slice(0, 16) : '',
      questionCount: Array.isArray(data.questions) ? data.questions.length : prev.questionCount,
      classroom_ids: selectedClassroomIds,
      current_classroom_id: data.classroom_id || test.classroom_id,
    }));
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!editForm.title.trim()) { setError('Title is required'); return; }
    if (!editForm.classroom_ids.length) { setError('Select at least one classroom'); return; }
    setSavingEdit(true); setError('');
    const res = await fetch(`/api/tests/${editForm.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editForm.title,
        description: editForm.description,
        time_limit_mins: editForm.time_limit_mins ? parseInt(editForm.time_limit_mins, 10) : null,
        due_at: editForm.due_at || null,
        classroom_ids: editForm.classroom_ids,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      await fetchTests();
      setShowEdit(false);
      if ((data.created_tests || []).length > 0) {
        notify(`Cloned this test to ${data.created_tests.length} additional classroom${data.created_tests.length === 1 ? '' : 's'}.`, {
          type: 'success',
          title: 'Test cloned',
        });
      }
    } else {
      setError(data.error || 'Failed to save test settings.');
    }
    setSavingEdit(false);
  }

  async function togglePublish(test) {
    const questionCount = Number(test.questions?.[0]?.count ?? 0);
    if (!test.is_published && questionCount < 1) {
      setPublishBlockedTest(test);
      setShowPublishHelp(true);
      return;
    }
    const res = await fetch(`/api/tests/${test.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published: !test.is_published }),
    });
    if (res.ok) {
      setTests(ts => ts.map(t => t.id === test.id ? { ...t, is_published: !t.is_published } : t));
    } else {
      const data = await res.json();
      notify(data?.error || 'Failed to publish test.', {
        type: 'danger',
        title: 'Publish failed',
      });
    }
  }

  async function deleteTest(testId) {
    const confirmed = await confirmAction({
      title: 'Delete test?',
      message: 'This cannot be undone. Student submissions linked to this test may no longer be accessible.',
      confirmLabel: 'Delete test',
      variant: 'danger',
    });
    if (!confirmed) return;
    await fetch(`/api/tests/${testId}`, { method: 'DELETE' });
    setTests(ts => ts.filter(t => t.id !== testId));
    notify('The test was deleted.', { type: 'success', title: 'Deleted' });
  }

  useEffect(() => {
    setForm((prev) => {
      if (prev.classroom_ids.length > 0 || !id) return prev;
      return { ...prev, classroom_ids: [id] };
    });
  }, [id]);

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
                  <div className="flex-gap" style={{ flexWrap: 'wrap' }}>
                    <span className="text-sm text-muted">{test.questions?.[0]?.count ?? 0} questions</span>
                    {test.time_limit_mins && <span className="text-sm text-muted">· {test.time_limit_mins} min</span>}
                    {test.due_at && <span className="text-sm text-muted">· Due (PKT): {formatPst(test.due_at)}</span>}
                    <span className="text-xs text-muted">{new Date(test.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex-gap">
                  <button className="btn btn-secondary btn-sm" onClick={() => togglePublish(test)}>
                    {test.is_published ? <><EyeOff size={14}/> Unpublish</> : <><Eye size={14}/> Publish</>}
                  </button>
                  <Link className="btn btn-secondary btn-sm" href={`/teacher/tests/${test.id}/edit`}>
                    <FlaskConical size={14}/> Questions
                  </Link>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEditTest(test)}><Edit size={14}/> Edit</button>
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
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Test'}</button>
        </>}
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ClassroomMultiSelect
            classrooms={teacherClassrooms}
            selectedIds={form.classroom_ids}
            onChange={(values) => updateSelectedClassrooms(values, false)}
            hint="Saving will create one separate test for each selected classroom."
          />
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
          <div className="form-group">
            <label className="form-label">Due Date & Time (Pakistan Standard Time)</label>
            <input
              className="form-input"
              type="datetime-local"
              value={form.due_at}
              onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))}
            />
            <span className="form-hint">Students can only start this test before this date/time (PKT).</span>
          </div>
          {error && <p className="form-error">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={showEdit}
        onClose={() => { setShowEdit(false); setError(''); }}
        title="Edit Test Settings"
        maxWidth={720}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={savingEdit}>
            {savingEdit ? 'Saving...' : 'Save Settings'}
          </button>
        </>}
      >
        <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ClassroomMultiSelect
            classrooms={teacherClassrooms}
            selectedIds={editForm.classroom_ids}
            lockedIds={editForm.current_classroom_id ? [editForm.current_classroom_id] : []}
            onChange={(values) => updateSelectedClassrooms(values, true)}
            hint="The current classroom stays selected. Additional selected classrooms receive cloned copies when you save."
          />
          <div className="form-group">
            <label className="form-label">Test Title *</label>
            <input className="form-input" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Time Limit (minutes)</label>
            <input className="form-input" type="number" min={1} max={300} value={editForm.time_limit_mins} onChange={e => setEditForm(f => ({ ...f, time_limit_mins: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Due Date & Time (Pakistan Standard Time)</label>
            <input className="form-input" type="datetime-local" value={editForm.due_at} onChange={e => setEditForm(f => ({ ...f, due_at: e.target.value }))} />
            <span className="form-hint">Students can only start this test before this date/time (PKT).</span>
          </div>
          {error && <p className="form-error">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={showPublishHelp}
        onClose={() => { setShowPublishHelp(false); setPublishBlockedTest(null); }}
        title="Add Questions First"
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setShowPublishHelp(false); setPublishBlockedTest(null); }}>Cancel</button>
          <Link
            className="btn btn-primary"
            href={publishBlockedTest ? `/teacher/tests/${publishBlockedTest.id}/edit` : '/teacher/dashboard'}
            onClick={() => { setShowPublishHelp(false); setPublishBlockedTest(null); }}
          >
            Go to Questions
          </Link>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className="text-sm text-muted" style={{ margin: 0 }}>
            You need to add at least one question before publishing this test.
          </p>
          {publishBlockedTest?.title && (
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              Test: <strong>{publishBlockedTest.title}</strong>
            </p>
          )}
          <p className="text-sm text-muted" style={{ margin: 0 }}>
            Open the Questions page, add a question, then come back here to publish it.
          </p>
        </div>
      </Modal>
    </div>
  );
}
