'use client';
import { useState, useEffect } from 'react';
import { useRequireRole } from '@/lib/hooks/useRequireRole';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import SQLEditor from '@/components/SQLEditor';
import OutputTable from '@/components/OutputTable';
import { DifficultyBadge } from '@/components/Badge';
import { Play, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';

const DIFFICULTIES = ['all', 'basic', 'intermediate', 'advanced'];

export default function PracticePage() {
  const { loading } = useRequireRole('student');
  const [problems, setProblems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [solution, setSolution] = useState(null);
  const [showSolution, setShowSolution] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { if (!loading) fetchProblems(); }, [loading, filter]);

  async function fetchProblems() {
    setFetching(true);
    const url = filter !== 'all' ? `/api/practice?difficulty=${filter}` : '/api/practice';
    const res = await fetch(url);
    if (res.ok) setProblems(await res.json());
    setFetching(false);
  }

  async function selectProblem(p) {
    setSelected(p); setQuery(''); setResult(null); setSolution(null); setShowSolution(false);
    const res = await fetch(`/api/practice/${p.id}`);
    if (res.ok) setSelected(await res.json());
  }

  async function runQuery() {
    if (!query.trim() || !selected) return;
    setRunning(true); setResult(null);
    const res = await fetch(`/api/practice/${selected.id}/run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    setResult(await res.json());
    setRunning(false);
  }

  async function revealSolution() {
    if (!showSolution && !solution) {
      const res = await fetch(`/api/practice/${selected.id}/solution`);
      const data = await res.json();
      setSolution(data.solution_sql);
    }
    setShowSolution(s => !s);
  }

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        <Navbar title="Practice" />
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start' }}>

          {/* Problem list */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div className="tabs">
                {DIFFICULTIES.map(d => (
                  <button key={d} className={`tab-btn ${filter === d ? 'active' : ''}`} onClick={() => setFilter(d)}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              {fetching ? (
                <div style={{ padding: 16 }}>{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 'var(--radius-md)' }} />)}</div>
              ) : problems.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No problems found</div>
              ) : problems.map(p => (
                <button key={p.id} onClick={() => selectProblem(p)}
                  style={{ width: '100%', padding: '14px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)', background: selected?.id === p.id ? 'var(--accent-light)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'background var(--transition)' }}>
                  <div style={{ fontWeight: 600, color: selected?.id === p.id ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 4 }}>{p.title}</div>
                  <DifficultyBadge difficulty={p.difficulty} />
                </button>
              ))}
            </div>
          </div>

          {/* Problem workspace */}
          {!selected ? (
            <div className="card empty-state" style={{ minHeight: 400 }}>
              <h3>Select a problem</h3>
              <p>Choose a problem from the list to start practicing</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <div className="flex-gap" style={{ marginBottom: 10 }}>
                  <h2 style={{ fontSize: '1.1rem' }}>{selected.title}</h2>
                  <DifficultyBadge difficulty={selected.difficulty} />
                </div>
                <p>{selected.description}</p>
              </div>

              <SQLEditor value={query} onChange={v => setQuery(v || '')} height={220} />

              <div className="flex-gap">
                <button className="btn btn-primary" onClick={runQuery} disabled={running}>
                  <Play size={16}/> {running ? 'Running…' : 'Run & Check'}
                </button>
                <button className="btn btn-secondary" onClick={revealSolution}>
                  {showSolution ? <><EyeOff size={14}/> Hide Solution</> : <><Eye size={14}/> View Solution</>}
                </button>
              </div>

              {result && (
                <div>
                  {result.evaluation && (
                    <div className="flex-gap" style={{ marginBottom: 12 }}>
                      {result.evaluation.isCorrect
                        ? <span className="flex-gap badge badge-success" style={{ padding: '8px 14px', fontSize: '0.875rem' }}><CheckCircle size={16}/> Correct! Well done.</span>
                        : <span className="flex-gap badge badge-danger" style={{ padding: '8px 14px', fontSize: '0.875rem' }}><XCircle size={16}/> Incorrect — {result.evaluation.actualCount} rows returned, {result.evaluation.expectedCount} expected</span>}
                    </div>
                  )}
                  <OutputTable rows={result.rows} columns={result.columns} error={result.error} />
                </div>
              )}

              {showSolution && solution && (
                <div className="card" style={{ borderColor: 'var(--accent)', borderWidth: 2 }}>
                  <p className="text-sm" style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 10 }}>✦ Solution</p>
                  <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{solution}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
