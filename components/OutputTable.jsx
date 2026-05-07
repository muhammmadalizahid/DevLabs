export default function OutputTable({ rows, columns, error, loading }) {
  if (loading) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div className="spinner" style={{ margin: '0 auto' }} />
      <p className="text-muted text-sm" style={{ marginTop: 10 }}>Running query…</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: '16px', background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)' }}>
      <p style={{ color: 'var(--danger)', fontSize: '0.875rem', fontFamily: 'monospace' }}>{error}</p>
    </div>
  );

  if (!rows) return null;

  if (rows.length === 0) return (
    <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
      <p className="text-muted text-sm">Query returned 0 rows.</p>
    </div>
  );

  const cols = columns || Object.keys(rows[0] || {});

  return (
    <div>
      <div className="output-table-wrap">
        <table className="output-table" style={{ width: '100%' }}>
          <thead>
            <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {cols.map(c => <td key={c}>{row[c] === null ? <span className="text-muted">NULL</span> : String(row[c])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted" style={{ marginTop: 6 }}>{rows.length} row{rows.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
