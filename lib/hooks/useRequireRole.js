'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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

  useEffect(() => {
    if (status === 'loading') return;
    const bootstrapRole = getBootstrapRole();
    const effectiveRole = session?.user?.role || bootstrapRole;

    if (!session && !bootstrapRole) { router.replace('/'); return; }
    if (!effectiveRole) { router.replace('/onboarding'); return; }
    if (requiredRole && effectiveRole !== requiredRole) {
      router.replace(effectiveRole === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    }
  }, [session, status, requiredRole, router]);

  return { session, status, loading: status === 'loading' };
}
