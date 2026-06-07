'use client';
import { signIn, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Database, Users, BookOpen, Zap, CheckCircle, Code2 } from 'lucide-react';

const features = [
  { icon: Users,       title: 'Classroom Management', desc: 'Create classrooms, control access with email restrictions, approve students instantly.' },
  { icon: Code2,       title: 'SQL Code Editor',       desc: 'Monaco-powered editor with syntax highlighting, run button, and live output.' },
  { icon: Zap,         title: 'Auto Evaluation',       desc: 'Sandboxed MySQL execution evaluates every submission instantly and accurately.' },
  { icon: BookOpen,    title: 'Practice Library',      desc: 'Built-in problem library from Basic to Advanced — no classroom needed.' },
  { icon: Database,    title: 'Custom Datasets',       desc: 'Upload your own schema and seed data to power custom test questions.' },
  { icon: CheckCircle, title: 'Results & Exports',     desc: 'Detailed dashboards, question-wise breakdown, CSV and Excel export.' },
];

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (status === 'loading' || redirectingRef.current) return;
    const bootstrapCookie = typeof document !== 'undefined'
      ? document.cookie.split('; ').find(entry => entry.startsWith('devlab_pending_role='))
      : null;
    const bootstrapRole = bootstrapCookie ? decodeURIComponent(bootstrapCookie.split('=')[1]) : null;
    const effectiveRole = session?.user?.role || bootstrapRole;

    if (effectiveRole === 'teacher' && pathname !== '/teacher/dashboard') {
      redirectingRef.current = true;
      router.replace('/teacher/dashboard');
    } else if (effectiveRole === 'student' && pathname !== '/student/dashboard') {
      redirectingRef.current = true;
      router.replace('/student/dashboard');
    } else if (session && !effectiveRole && pathname !== '/onboarding') {
      redirectingRef.current = true;
      router.replace('/onboarding');
    }
  }, [session, status, router, pathname]);

  useEffect(() => {
    redirectingRef.current = false;
  }, [pathname]);

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="container flex-between" style={{ height: '64px' }}>
          <div className="flex-gap" style={{ gap: 10 }}>
            <div className="sidebar-logo">D</div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent)' }}>DevLab</span>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => signIn('google')}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Loading...' : 'Sign in with Google'}
          </button>
        </div>
      </nav>

      <section className="hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="hero-badge animate-slideUp">
            <Zap size={14} /> SQL Assessment Platform
          </div>
          <h1 className="hero-title animate-slideUp">
            The Classroom for<br />
            <span className="gradient-text">SQL Mastery</span>
          </h1>
          <p className="hero-desc animate-slideUp">
            DevLab gives teachers full control over SQL assessments — create tests, upload datasets,
            auto-evaluate every submission — while students get a world-class practice environment.
          </p>
          <div className="flex-center" style={{ gap: 16, flexWrap: 'wrap' }} >
            <button className="btn btn-primary btn-lg animate-slideUp" onClick={() => signIn('google')}>
              Get Started — It&apos;s Free
            </button>
            <a className="btn btn-secondary btn-lg animate-slideUp" href="#features">
              See Features
            </a>
          </div>
        </div>

        {/* Hero visual */}
        <div className="hero-visual animate-fadeIn">
          <div className="hero-card">
            <div className="editor-toolbar">
              <span>query.sql</span>
              <span className="badge badge-success">● Connected</span>
            </div>
            <div className="hero-code">
              <span className="code-kw">SELECT</span> e.name, d.department_name,{'\n'}
              {'       '}e.salary{'\n'}
              <span className="code-kw">FROM</span> employees e{'\n'}
              <span className="code-kw">JOIN</span> departments d{'\n'}
              {'  ON'} e.dept_id <span className="code-kw">=</span> d.id{'\n'}
              <span className="code-kw">WHERE</span> e.salary {'>'} <span className="code-num">50000</span>{'\n'}
              <span className="code-kw">ORDER BY</span> e.salary <span className="code-kw">DESC</span>;
            </div>
            <div className="hero-result">
              <div className="output-table-wrap" style={{ maxHeight: 140 }}>
                <table className="output-table" style={{ width: '100%' }}>
                  <thead><tr><th>name</th><th>department_name</th><th>salary</th></tr></thead>
                  <tbody>
                    <tr><td>Sarah Chen</td><td>Engineering</td><td>92000</td></tr>
                    <tr><td>Ahmed Raza</td><td>Engineering</td><td>87500</td></tr>
                    <tr><td>Maria Lopez</td><td>Design</td><td>71000</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="flex-gap" style={{ marginTop: 10 }}>
                <span className="badge badge-success">✓ Correct Answer</span>
                <span className="text-muted text-xs">3 rows · 0.04s</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="section">
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: 8 }}>Everything you need</h2>
          <p style={{ textAlign: 'center', marginBottom: 48 }}>Built for modern SQL education — from classroom setup to automated grading.</p>
          <div className="grid-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card card-hover feature-card">
                <div className="feature-icon"><Icon size={22} /></div>
                <h3 style={{ margin: '14px 0 8px' }}>{title}</h3>
                <p style={{ fontSize: '0.9rem' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2>Ready to transform your SQL classroom?</h2>
          <p style={{ marginBottom: 32, marginTop: 8 }}>Join as a teacher or student — no credit card required.</p>
          <button className="btn btn-primary btn-lg" onClick={() => signIn('google')}>
            Sign in with Google
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container flex-between" style={{ flexWrap: 'wrap', gap: 8 }}>
          <span className="flex-gap" style={{ gap: 8, fontWeight: 700, color: 'var(--accent)' }}>
            <div className="sidebar-logo" style={{ width: 22, height: 22, fontSize: '0.75rem' }}>D</div>
            DevLab
          </span>
          <span className="text-muted text-sm">© 2026 DevLab. SQL Assessment Platform.</span>
        </div>
      </footer>

      <style jsx>{`
        .landing { min-height: 100vh; }
        .landing-nav {
          position: sticky; top: 0; z-index: 50;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(8px);
        }
        .hero {
          padding: 80px 0 60px;
          background: radial-gradient(ellipse 80% 60% at 50% -10%, var(--accent-glow), transparent);
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--accent-light); color: var(--accent);
          padding: 5px 14px; border-radius: var(--radius-full);
          font-size: 0.8rem; font-weight: 600; margin-bottom: 20px;
        }
        .hero-title { margin-bottom: 20px; letter-spacing: -0.03em; }
        .gradient-text {
          background: linear-gradient(135deg, var(--accent), var(--teal));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-desc {
          font-size: 1.1rem; max-width: 560px; margin: 0 auto 36px;
          color: var(--text-secondary);
        }
        .hero-visual {
          max-width: 620px; margin: 60px auto 0;
          padding: 0 24px;
        }
        .hero-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-lg), var(--shadow-glow);
        }
        .hero-code {
          padding: 20px 24px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          line-height: 1.8;
          white-space: pre;
          background: var(--bg-secondary);
          color: var(--text-primary);
          overflow-x: auto;
        }
        .hero-result { padding: 16px 24px 20px; }
        .code-kw  { color: var(--accent); font-weight: 600; }
        .code-num { color: var(--teal); }
        .feature-card { display: flex; flex-direction: column; }
        .feature-icon {
          width: 44px; height: 44px; border-radius: var(--radius-md);
          background: var(--accent-light); color: var(--accent);
          display: flex; align-items: center; justify-content: center;
        }
        .cta-section {
          padding: 80px 0;
          background: radial-gradient(ellipse 60% 80% at 50% 50%, var(--accent-glow), transparent);
        }
        .landing-footer {
          border-top: 1px solid var(--border);
          padding: 24px 0;
          background: var(--bg-secondary);
        }
      `}</style>
    </div>
  );
}
