'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard, BookOpen, FlaskConical, Users,
  Database, BarChart2, LogOut, GraduationCap, Code2,
} from 'lucide-react';

const teacherNav = [
  { href: '/teacher/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
];

const studentNav = [
  { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/student/practice',  label: 'Practice',  icon: Code2 },
];

export default function Sidebar({ classroomId }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isTeacher = session?.user?.role === 'teacher';
  const navItems = isTeacher ? teacherNav : studentNav;

  const dynamicTeacherNav = classroomId ? [
    { href: `/teacher/classrooms/${classroomId}`,         label: 'Students',  icon: Users },
    { href: `/teacher/classrooms/${classroomId}/tests`,   label: 'Tests',     icon: FlaskConical },
    { href: `/teacher/classrooms/${classroomId}/results`, label: 'Results',   icon: BarChart2 },
  ] : [];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">D</div>
        DevLab
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Menu</span>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`sidebar-item ${pathname === href ? 'active' : ''}`}
          >
            <Icon size={18} /> {label}
          </Link>
        ))}

        {isTeacher && dynamicTeacherNav.length > 0 && (
          <>
            <span className="sidebar-section-label" style={{ marginTop: 8 }}>Classroom</span>
            {dynamicTeacherNav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`sidebar-item ${pathname.startsWith(href) ? 'active' : ''}`}
              >
                <Icon size={18} /> {label}
              </Link>
            ))}
          </>
        )}

        {isTeacher && (
          <>
            <span className="sidebar-section-label" style={{ marginTop: 8 }}>Resources</span>
            <Link href="/teacher/datasets" className={`sidebar-item ${pathname.startsWith('/teacher/datasets') ? 'active' : ''}`}>
              <Database size={18} /> Datasets
            </Link>
          </>
        )}

        {!isTeacher && (
          <>
            <span className="sidebar-section-label" style={{ marginTop: 8 }}>Learning</span>
            <Link href="/student/practice" className={`sidebar-item ${pathname.startsWith('/student/practice') ? 'active' : ''}`}>
              <BookOpen size={18} /> Practice
            </Link>
          </>
        )}
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
