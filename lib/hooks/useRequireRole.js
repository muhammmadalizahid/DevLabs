'use client';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';

function getBootstrapRole() {
  if (typeof document === 'undefined') return null;

  const cookie = document.cookie
    .split('; ')
    .find(entry => entry.startsWith('devlab_pending_role='));

  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}

/**
 * Hook that redirects if user doesn't have the required role.
 * @param {'teacher'|'student'} requiredRole
 */
export function useRequireRole(requiredRole) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const redirectingRef = useRef(false);

  const bootstrapRole = useMemo(() => getBootstrapRole(), [pathname]);
  const effectiveRole = session?.user?.role || bootstrapRole || null;

  useEffect(() => {
    if (status === 'loading' || redirectingRef.current) return;

    if (!session && !bootstrapRole) {
      if (pathname !== '/') {
        redirectingRef.current = true;
        router.replace('/');
      }
      return;
    }

    if (!effectiveRole) {
      if (pathname !== '/onboarding') {
        redirectingRef.current = true;
        router.replace('/onboarding');
      }
      return;
    }

    if (requiredRole && effectiveRole !== requiredRole) {
      const next = effectiveRole === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
      if (pathname !== next) {
        redirectingRef.current = true;
        router.replace(next);
      }
    }
  }, [session, status, requiredRole, router, pathname, bootstrapRole, effectiveRole]);

  useEffect(() => {
    // Reset redirect guard once route changes/settles.
    redirectingRef.current = false;
  }, [pathname]);

  return {
    session,
    status,
    role: effectiveRole,
    loading: status === 'loading' || redirectingRef.current,
  };
}
