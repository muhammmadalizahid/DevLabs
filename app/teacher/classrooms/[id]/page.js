'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import DataTable from '@/components/DataTable';
import { StatusBadge } from '@/components/Badge';
import { Check, X, Trash2, Users, UserCheck } from 'lucide-react';

export default function ClassroomStudentsPage() {
  const { id } = useParams();
  const { loading } = useRequireRole('teacher');
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [tab, setTab] = useState('pending');
  const [classroomFilter, setClassroomFilter] = useState('all');
  const [fetching, setFetching] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    if (!loading && id) {
      fetchClassrooms();
      fetchStudents(tab, classroomFilter);
    }
  }, [loading, id]);

  useEffect(() => {
    if (id) fetchStudents(tab, classroomFilter);
  }, [tab, classroomFilter, id]);

  async function fetchClassrooms() {
    const res = await fetch('/api/classrooms');
    if (res.ok) {
      const data = await res.json();
      setClassrooms(Array.isArray(data) ? data : []);
    }
  }

  async function fetchStudents(status, selectedClassroom = classroomFilter) {
    setFetching(true);
    const params = new URLSearchParams({
      status,
      scope: 'all',
      classroomId: selectedClassroom,
    });
    const res = await fetch(`/api/classrooms/${id}/students?${params.toString()}`);
    if (res.ok) setStudents(await res.json());
    setFetching(false);
  }

  async function action(row, act) {
    const actionKey = `${row.classroom_id}:${row.student_id}`;
    setActing(actionKey);
    await fetch(`/api/classrooms/${row.classroom_id}/students/${row.student_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act }),
    });
    await fetchStudents(tab, classroomFilter);
    setActing(null);
  }

  async function bulkApprove() {
    const params = new URLSearchParams({
      scope: 'all',
      classroomId: classroomFilter,
    });
    await fetch(`/api/classrooms/${id}/students/bulk?${params.toString()}`, { method: 'POST' });
    await fetchStudents(tab, classroomFilter);
  }

  const columns = [
    {
      key: 'avatar',
      label: '',
      sortable: false,
      render: (_, row) => (
        row.users?.avatar_url
          ? <img src={row.users.avatar_url} className="avatar" alt="" />
          : <div className="avatar-placeholder">{row.users?.name?.[0]}</div>
      ),
    },
    {
      key: 'name',
      label: 'Student',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.users?.name}</div>
          <div className="text-xs text-muted">{row.users?.email}</div>
        </div>
      ),
    },
    {
      key: 'classroom_name',
      label: 'Classroom',
      render: (_, row) => row.classrooms?.name || 'Classroom',
    },
    { key: 'requested_at', label: 'Requested', render: value => new Date(value).toLocaleDateString() },
    { key: 'status', label: 'Status', render: value => <StatusBadge status={value} /> },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex-gap">
          {row.status === 'pending' && (
            <>
              <button className="btn btn-sm btn-primary" disabled={acting === `${row.classroom_id}:${row.student_id}`} onClick={() => action(row, 'approve')}><Check size={14} /></button>
              <button className="btn btn-sm btn-danger" disabled={acting === `${row.classroom_id}:${row.student_id}`} onClick={() => action(row, 'reject')}><X size={14} /></button>
            </>
          )}
          {row.status === 'approved' && (
            <button className="btn btn-sm btn-danger" disabled={acting === `${row.classroom_id}:${row.student_id}`} onClick={() => action(row, 'remove')}><Trash2 size={14} /></button>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="page-layout">
      <Sidebar classroomId={id} />
      <div className="page-content">
        <Navbar
          title="Students"
          actions={
            tab === 'pending' && students.length > 0
              ? <button className="btn btn-primary btn-sm" onClick={bulkApprove}><UserCheck size={16} /> Approve All</button>
              : null
          }
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) minmax(220px, 320px)', gap: 16, marginBottom: 24 }}>
          <div>
            <label className="form-label" htmlFor="student-status-filter" style={{ marginBottom: 8, display: 'block' }}>
              Student Status
            </label>
            <select
              id="student-status-filter"
              className="form-input"
              value={tab}
              onChange={(event) => setTab(event.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="classroom-filter" style={{ marginBottom: 8, display: 'block' }}>
              Classroom
            </label>
            <select
              id="classroom-filter"
              className="form-input"
              value={classroomFilter}
              onChange={(event) => setClassroomFilter(event.target.value)}
            >
              <option value="all">All classrooms</option>
              {classrooms.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
        </div>

        {fetching
          ? <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
          : <div className="card p-0"><DataTable columns={columns} data={students} emptyMessage={`No ${tab} students`} /></div>
        }
      </div>
    </div>
  );
}
