'use client';
import ThemeToggle from './ThemeToggle';
import { Menu, ArrowLeft } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

function shouldShowBack(pathname) {
  const noBack = new Set([
    '/',
    '/teacher/dashboard',
    '/student/dashboard',
    '/teacher/datasets',
    '/student/practice',
  ]);
  if (noBack.has(pathname)) return false;
  return pathname.split('/').filter(Boolean).length >= 2;
}

function getFallbackRoute(pathname) {
  if (!pathname || pathname === '/') return '/';

  if (pathname.startsWith('/teacher/classrooms/')) {
    return '/teacher/dashboard';
  }

  if (pathname.startsWith('/teacher/tests/')) {
    return '/teacher/dashboard';
  }

  if (pathname.startsWith('/teacher/')) {
    return '/teacher/dashboard';
  }

  if (pathname.startsWith('/student/tests/')) {
    return '/student/dashboard';
  }

  if (pathname.startsWith('/student/')) {
    return '/student/dashboard';
  }

  return '/';
}

export default function Navbar({ title, actions, onMenuClick, showBack, backHref }) {
  const router = useRouter();
  const pathname = usePathname();
  const canBack = showBack ?? shouldShowBack(pathname);

  function handleBack() {
    if (backHref) {
      router.push(backHref);
      return;
    }

    if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.referrer) {
      try {
        const referrer = new URL(document.referrer);
        const current = new URL(window.location.href);
        const previousPath = `${referrer.pathname}${referrer.search}`;
        const currentPath = `${current.pathname}${current.search}`;

        // Navigate freshly to the previous same-origin page instead of popping browser history.
        if (referrer.origin === current.origin && previousPath && previousPath !== currentPath) {
          router.push(previousPath);
          return;
        }
      } catch {
        // Fall back to deterministic route handling below.
      }
    }

    router.push(getFallbackRoute(pathname));
  }

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="btn btn-ghost btn-icon" onClick={onMenuClick} style={{ display: 'none' }} id="mobile-menu-btn">
          <Menu size={20} />
        </button>
        {canBack && (
          <button className="btn btn-ghost btn-icon" onClick={handleBack} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
        )}
        {title && <h1 className="navbar-title" style={{ fontSize: '1rem', fontWeight: 700 }}>{title}</h1>}
      </div>
      <div className="navbar-right">
        {actions}
        <ThemeToggle />
      </div>
      <style jsx>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
