'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import DataTable from '@/components/DataTable';
import { StatusBadge } from '@/components/Badge';
import { BookOpen, Plus, FlaskConical, RotateCw } from 'lucide-react';

export default function StudentDashboard() {
  const { loading } = useRequireRole('student');
  const [classrooms, setClassrooms] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState(null);

  const fetchClassrooms = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    else setRefreshing(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/classrooms');
      if (res.ok) {
        const data = await res.json();
        setClassrooms(data);
      } else {
        const error = await res.json();
        setFetchError(error.error || 'Failed to load classrooms');
      }
    } catch (err) {
      setFetchError(err.message);
    } finally {
      if (!silent) setFetching(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (!loading) fetchClassrooms(false); }, [loading, fetchClassrooms]);

  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchClassrooms(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [loading, fetchClassrooms]);

  async function handleJoin(e) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setJoining(true); setJoinMsg(null);
    const res = await fetch('/api/classrooms/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: inviteCode }),
    });
    const data = await res.json();
    if (res.ok) {
      setJoinMsg({ type: 'success', text: `Request sent to "${data.classroom_name}". Awaiting teacher approval.` });
      fetchClassrooms(false);
      setInviteCode('');
    } else setJoinMsg({ type: 'error', text: data.error });
    setJoining(false);
  }

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;

  const pendingRequests = classrooms.filter(c => c.enrollment_status === 'pending');
  const requestColumns = [
    {
      key: 'name',
      label: 'Classroom',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.name || 'Classroom'}</div>
          <div className="text-xs text-muted">{row.description || 'Awaiting teacher approval'}</div>
        </div>
      ),
    },
    {
      key: 'requested_at',
      label: 'Requested',
      render: (value) => (
        value
          ? new Date(value).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })
          : '—'
      ),
    },
    {
      key: 'enrollment_status',
      label: 'Status',
      render: (value) => <StatusBadge status={value || 'pending'} />,
    },
  ];

  return (
    <div className="page-layout">
      <Sidebar classroomId={classrooms.find(c => c.enrollment_status === 'approved')?.id || classrooms?.[0]?.id} />
      <div className="page-content">
        <Navbar title="My Classrooms" actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => fetchClassrooms(false)} disabled={fetching || refreshing}><RotateCw size={16} style={{ animation: (fetching || refreshing) ? 'spin 1s linear infinite' : 'none' }}/> Refresh</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowJoin(true)}><Plus size={16}/> Join Classroom</button>
          </div>
        } />

        <div className="grid-3" style={{ marginBottom: 28 }}>
          <div className="stat-card"><div className="stat-value">{classrooms.length}</div><div className="stat-label">Enrolled</div></div>
          <div className="stat-card"><div className="stat-value">{classrooms.filter(c => c.enrollment_status === 'approved').length}</div><div className="stat-label">Active</div></div>
          <div className="stat-card"><div className="stat-value">{pendingRequests.length}</div><div className="stat-label">Pending Requests</div></div>
        </div>

        {pendingRequests.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 8 }}>Requests Dashboard</h3>
            <div className="card p-0" style={{ boxShadow: 'none', border: '1px solid var(--border)' }}>
              <DataTable
                columns={requestColumns}
                data={pendingRequests}
                pageSize={5}
                emptyMessage="No pending requests"
              />
            </div>
          </div>
        )}

        {fetchError && (
          <div className="card empty-state" style={{ borderLeft: '4px solid var(--error)', background: 'rgba(255,68,68,0.05)' }}>
            <p style={{ color: 'var(--error)', fontWeight: 500 }}>{fetchError}</p>
          </div>
        )}

        {fetching ? (
          <div className="grid-2">{[1,2].map(i => <div key={i} className="card"><div className="skeleton" style={{ height: 120 }} /></div>)}</div>
        ) : classrooms.length === 0 ? (
          <div className="card empty-state">
            <BookOpen size={48} />
            <h3>No classrooms yet</h3>
            <p>Join a classroom using an invite code from your teacher</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowJoin(true)}><Plus size={16}/> Join Classroom</button>
          </div>
        ) : (
          <div className="grid-2">
            {classrooms.map(c => (
              <div key={c.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="flex-between">
                  <h3 className="truncate">{c.name}</h3>
                  <StatusBadge status={c.enrollment_status} />
                </div>
                {c.description && <p className="text-sm">{c.description}</p>}
                {c.enrollment_status === 'approved' && (
                  <div className="flex-gap" style={{ marginTop: 'auto' }}>
                    <a href={`/student/classrooms/${c.id}`} className="btn btn-secondary btn-sm"><FlaskConical size={14}/> View Tests</a>
                  </div>
                )}
                {c.enrollment_status === 'pending' && (
                  <p className="text-sm text-muted">Request pending for classroom "{c.name}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showJoin} onClose={() => { setShowJoin(false); setJoinMsg(null); setInviteCode(''); }}
        title="Join a Classroom"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowJoin(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleJoin} disabled={joining}>{joining ? 'Joining...' : 'Send Request'}</button>
        </>}
      >
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Invite Code</label>
            <input id="invite-code" className="form-input" placeholder="e.g. AB12CD" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
              value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} />
            <span className="form-hint">Ask your teacher for the 8-character invite code</span>
          </div>
          {joinMsg && <p className={joinMsg.type === 'success' ? 'text-sm' : 'form-error'} style={joinMsg.type === 'success' ? { color: 'var(--success)' } : {}}>{joinMsg.text}</p>}
        </form>
      </Modal>
    </div>
  );
}
