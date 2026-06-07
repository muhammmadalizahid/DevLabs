'use client';
import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, footer, maxWidth = 560, disableClose = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (!disableClose && e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, disableClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (!disableClose && e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth }} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close modal" disabled={disableClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
