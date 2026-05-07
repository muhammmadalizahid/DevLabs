'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Hook that redirects if user doesn't have the required role.
 * @param {'teacher'|'student'} requiredRole
 */
export function useRequireRole(requiredRole) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.replace('/'); return; }
    if (!session.user.role) { router.replace('/onboarding'); return; }
    if (requiredRole && session.user.role !== requiredRole) {
      router.replace(session.user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    }
  }, [session, status, requiredRole, router]);

  return { session, status, loading: status === 'loading' };
}
