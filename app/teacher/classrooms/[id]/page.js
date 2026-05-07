'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import DataTable from '@/components/DataTable';
import { StatusBadge } from '@/components/Badge';
import { Check, X, Trash2, Users, UserCheck } from 'lucide-react';

export default function ClassroomStudentsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { loading } = useRequireRole('teacher');
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [tab, setTab] = useState('pending');
  const [fetching, setFetching] = useState(true);
  const [acting, setActing] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (!loading && id) { fetchClassroom(); fetchStudents(tab); } }, [loading, id]);
  useEffect(() => { if (id) fetchStudents(tab); }, [tab]);

  async function fetchClassroom() {
    const res = await fetch(`/api/classrooms/${id}`);
    if (res.ok) setClassroom(await res.json());
  }

  async function fetchStudents(status) {
    setFetching(true);
    const res = await fetch(`/api/classrooms/${id}/students?status=${status}`);
    if (res.ok) setStudents(await res.json());
    setFetching(false);
  }

  async function action(studentId, act) {
    setActing(studentId);
    await fetch(`/api/classrooms/${id}/students/${studentId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: act }),
    });
    await fetchStudents(tab);
    setActing(null);
  }

  async function bulkApprove() {
    await fetch(`/api/classrooms/${id}/students/bulk`, { method: 'POST' });
    await fetchStudents(tab);
  }

  async function deleteClassroom() {
    setDeleting(true);
    const res = await fetch(`/api/classrooms/${id}`, { method: 'DELETE' });
    setDeleting(false);
    if (res.ok) {
      router.push('/teacher/dashboard');
    }
  }

  const columns = [
    { key: 'avatar', label: '', sortable: false, render: (_, row) => (
      row.users?.avatar_url
        ? <img src={row.users.avatar_url} className="avatar" alt="" />
        : <div className="avatar-placeholder">{row.users?.name?.[0]}</div>
    )},
    { key: 'name',  label: 'Student',  render: (_, r) => <div><div style={{ fontWeight: 600 }}>{r.users?.name}</div><div className="text-xs text-muted">{r.users?.email}</div></div> },
    { key: 'requested_at', label: 'Requested', render: v => new Date(v).toLocaleDateString() },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'actions', label: 'Actions', sortable: false, render: (_, row) => (
      <div className="flex-gap">
        {row.status === 'pending' && <>
          <button className="btn btn-sm btn-primary" disabled={acting === row.student_id} onClick={() => action(row.student_id, 'approve')}><Check size={14}/></button>
          <button className="btn btn-sm btn-danger" disabled={acting === row.student_id} onClick={() => action(row.student_id, 'reject')}><X size={14}/></button>
        </>}
        {row.status === 'approved' && (
          <button className="btn btn-sm btn-danger" disabled={acting === row.student_id} onClick={() => action(row.student_id, 'remove')}><Trash2 size={14}/></button>
        )}
      </div>
    )},
  ];

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="page-layout">
      <Sidebar classroomId={id} />
      <div className="page-content">
        <Navbar title={classroom?.name || 'Classroom'} actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {tab === 'pending' && students.length > 0 &&
              <button className="btn btn-primary btn-sm" onClick={bulkApprove}><UserCheck size={16}/> Approve All</button>
            }
            <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteModal(true)}><Trash2 size={16}/> Delete Classroom</button>
          </div>
        } />

        <div className="tabs" style={{ maxWidth: 340, marginBottom: 24 }}>
          {['pending','approved','rejected'].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {fetching
          ? <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
          : <div className="card p-0"><DataTable columns={columns} data={students} emptyMessage={`No ${tab} students`} /></div>
        }
      </div>

      <Modal open={showDeleteModal} onClose={() => !deleting && setShowDeleteModal(false)}
        title="Delete Classroom"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</button>
          <button className="btn btn-danger" onClick={deleteClassroom} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete Classroom'}</button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p>Are you sure you want to delete this classroom? This action cannot be undone.</p>
          <div style={{ background: 'rgba(255,68,68,0.1)', padding: 12, borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--error)' }}>
            <p className="text-sm" style={{ color: 'var(--error)', fontWeight: 500, margin: 0 }}>⚠️ All enrollments and associated data will be permanently deleted.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
