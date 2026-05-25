'use client';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { GraduationCap, BookOpen } from 'lucide-react';

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  async function handleSelect(role) {
    setSelected(role);
    setLoading(true);
    const destination = role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';

    const setBootstrapRoleCookie = () => {
      document.cookie = `devlab_pending_role=${role}; Path=/; Max-Age=300; SameSite=Lax`;
    };

    const navigateToDestination = () => {
      setBootstrapRoleCookie();
      window.location.replace(destination);
    };

    try {
      const res = await fetch('/api/user/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        console.log('[Onboarding] Role updated, refreshing session...');
        void update({ role }).then(result => {
          console.log('[Onboarding] Session refreshed:', result);
        }).catch(error => {
          console.warn('[Onboarding] Session refresh failed:', error);
        });

        console.log('[Onboarding] Navigating to dashboard for role:', role);
        navigateToDestination();
      } else {
        const responseText = await res.text();
        let responseError = responseText || { status: res.status, statusText: res.statusText };

        try {
          if (responseText) {
            responseError = JSON.parse(responseText);
          }
        } catch {
          responseError = responseText || { status: res.status, statusText: res.statusText };
        }

        if (typeof responseError === 'object' && responseError && Object.keys(responseError).length === 0) {
          responseError = { status: res.status, statusText: res.statusText };
        }

        console.warn('[Onboarding] Failed to update role:', responseError);

        if (res.status >= 500 || responseError?.error === 'TypeError: fetch failed') {
          void update({ role }).catch(error => {
            console.warn('[Onboarding] Session refresh failed after role update error:', error);
          });
          navigateToDestination();
          return;
        }

        setLoading(false);
        setSelected(null);
      }
    } catch (err) {
      console.error('[Onboarding] Error:', err);

      void update({ role }).catch(error => {
        console.warn('[Onboarding] Session refresh failed after onboarding error:', error);
      });
      navigateToDestination();
    }
  }

  return (
    <div className="onboarding-wrap">
      <div className="onboarding-card animate-slideUp">
        <div className="flex-center" style={{ marginBottom: 24 }}>
          <div className="sidebar-logo" style={{ width: 48, height: 48, fontSize: '1.4rem' }}>D</div>
        </div>
        <h1 style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: 6 }}>Welcome to DevLab</h1>
        <p style={{ textAlign: 'center', marginBottom: 32 }}>
          Hi {session?.user?.name?.split(' ')[0] || 'there'}! How will you be using DevLab?
        </p>
        <div className="role-options">
          <button
            className={`role-btn ${selected === 'teacher' ? 'role-btn-active' : ''}`}
            onClick={() => handleSelect('teacher')}
            disabled={loading}
            id="role-teacher"
          >
            <GraduationCap size={32} />
            <span className="role-title">I&apos;m a Teacher</span>
            <span className="role-desc">Create classrooms, build tests, and evaluate student performance</span>
          </button>
          <button
            className={`role-btn ${selected === 'student' ? 'role-btn-active' : ''}`}
            onClick={() => handleSelect('student')}
            disabled={loading}
            id="role-student"
          >
            <BookOpen size={32} />
            <span className="role-title">I&apos;m a Student</span>
            <span className="role-desc">Join classrooms, take tests, and practice SQL queries</span>
          </button>
        </div>
        {loading && (
          <div className="flex-center" style={{ marginTop: 20, gap: 10 }}>
            <div className="spinner" />
            <span className="text-muted text-sm">Setting up your account…</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .onboarding-wrap {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          background: radial-gradient(ellipse 80% 60% at 50% 0%, var(--accent-glow), transparent);
          padding: 24px;
        }
        .onboarding-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 48px 40px;
          max-width: 520px; width: 100%;
          box-shadow: var(--shadow-lg);
        }
        .role-options { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 480px) { .role-options { grid-template-columns: 1fr; } }
        .role-btn {
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          padding: 28px 20px;
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--bg-secondary);
          color: var(--text-primary);
          transition: all var(--transition);
          cursor: pointer;
        }
        .role-btn:hover {
          border-color: var(--accent);
          background: var(--accent-light);
          color: var(--accent);
          transform: translateY(-2px);
          box-shadow: var(--shadow-glow);
        }
        .role-btn-active {
          border-color: var(--accent) !important;
          background: var(--accent-light) !important;
          color: var(--accent) !important;
        }
        .role-title { font-weight: 700; font-size: 1rem; }
        .role-desc  { font-size: 0.8rem; text-align: center; color: inherit; opacity: 0.75; }
      `}</style>
    </div>
  );
}
