export default function Badge({ children, variant = 'info' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

export function DifficultyBadge({ difficulty }) {
  const map = { basic: 'basic', intermediate: 'intermediate', advanced: 'advanced' };
  return <Badge variant={map[difficulty] || 'neutral'}>{difficulty}</Badge>;
}

export function StatusBadge({ status }) {
  const map = {
    submitted: 'success',
    in_progress: 'warning',
    approved: 'success',
    pending: 'warning',
    rejected: 'danger',
    published: 'info',
    draft: 'neutral',
  };
  return <Badge variant={map[status] || 'neutral'}>{status?.replace('_', ' ')}</Badge>;
}
