'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard, FlaskConical, Users,
  Database, BarChart2, LogOut, Code2,
} from 'lucide-react';

const teacherBaseNav = [
  { href: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === '/teacher/dashboard' },
];

const studentBaseNav = [
  { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === '/student/dashboard' },
];

function classroomIdFromPath(pathname) {
  const m = pathname.match(/^\/(teacher|student)\/classrooms\/([^/]+)/);
  return m?.[2] || null;
}

function buildTeacherClassroomNav(id) {
  const base = `/teacher/classrooms/${id}`;
  return [
    { href: base, label: 'Students', icon: Users, match: (p) => p === base },
    { href: `${base}/tests`, label: 'Tests', icon: FlaskConical, match: (p) => p.startsWith(`${base}/tests`) || p.startsWith('/teacher/tests/') },
    { href: `${base}/results`, label: 'Results', icon: BarChart2, match: (p) => p.startsWith(`${base}/results`) || p.startsWith('/teacher/submissions/') },
  ];
}

function buildStudentClassroomNav(id) {
  const testsHref = `/student/classrooms/${id}`;
  return [
    { href: testsHref, label: 'Tests', icon: FlaskConical, match: (p) => p.startsWith(testsHref) || p.startsWith('/student/tests/') },
    { href: '/student/results', label: 'Results', icon: BarChart2, match: (p) => p.startsWith('/student/results') },
  ];
}

export default function Sidebar({ classroomId }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isTeacher = session?.user?.role === 'teacher';
  const rolePrefix = isTeacher ? 'teacher' : 'student';
  const storageKey = `devlab:lastClassroom:${rolePrefix}`;
  const routeClassroomId = classroomIdFromPath(pathname);
  const savedClassroomId = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (routeClassroomId) {
      localStorage.setItem(storageKey, routeClassroomId);
    }
  }, [routeClassroomId, storageKey]);

  const currentClassroomId = classroomId || routeClassroomId || savedClassroomId;
  const navItems = isTeacher ? teacherBaseNav : studentBaseNav;
  const classroomNav = useMemo(() => {
    if (!currentClassroomId) return [];
    return isTeacher ? buildTeacherClassroomNav(currentClassroomId) : buildStudentClassroomNav(currentClassroomId);
  }, [currentClassroomId, isTeacher]);

  const resourcesNav = isTeacher
    ? [{ href: '/teacher/datasets', label: 'Datasets', icon: Database, match: (p) => p.startsWith('/teacher/datasets') }]
    : [
        { href: '/student/practice', label: 'Practice', icon: Code2, match: (p) => p.startsWith('/student/practice') },
      ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">D</div>
        DevLab
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Menu</span>
        {navItems.map(({ href, label, icon: Icon, match }) => (
          <Link key={href} href={href} className={`sidebar-item ${match(pathname) ? 'active' : ''}`}>
            <Icon size={18} /> {label}
          </Link>
        ))}

        {classroomNav.length > 0 && (
          <>
            <span className="sidebar-section-label" style={{ marginTop: 8 }}>Classroom</span>
            {classroomNav.map(({ href, label, icon: Icon, match }) => (
              <Link key={href} href={href} className={`sidebar-item ${match(pathname) ? 'active' : ''}`}>
                <Icon size={18} /> {label}
              </Link>
            ))}
          </>
        )}

        <span className="sidebar-section-label" style={{ marginTop: 8 }}>{isTeacher ? 'Resources' : 'Learning'}</span>
        {resourcesNav.map(({ href, label, icon: Icon, match }) => (
          <Link key={href} href={href} className={`sidebar-item ${match(pathname) ? 'active' : ''}`}>
            <Icon size={18} /> {label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {session?.user?.image
            ? <img src={session.user.image} alt="" className="avatar" />
            : <div className="avatar-placeholder">{session?.user?.name?.[0] || 'U'}</div>
          }
          <div style={{ minWidth: 0 }}>
            <div className="truncate" style={{ fontWeight: 600, fontSize: '0.85rem' }}>{session?.user?.name}</div>
            <div className="text-xs text-muted truncate">{isTeacher ? 'Teacher' : 'Student'}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm w-full" style={{ justifyContent: 'flex-start' }} onClick={() => signOut({ callbackUrl: '/' })}>
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}
