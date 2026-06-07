'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

const UIFeedbackContext = createContext(null)

function toastIcon(type) {
  if (type === 'success') return <CheckCircle2 size={18} />
  if (type === 'danger') return <XCircle size={18} />
  if (type === 'warning') return <AlertTriangle size={18} />
  return <Info size={18} />
}

export function UIFeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const confirmResolver = useRef(null)

  const dismissToast = useCallback((id) => {
    setToasts((items) => items.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback((message, options = {}) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const toast = {
      id,
      message,
      type: options.type || 'info',
      title: options.title || null,
    }
    setToasts((items) => [...items, toast].slice(-4))

    window.setTimeout(() => dismissToast(id), options.duration ?? 4500)
    return id
  }, [dismissToast])

  const confirmAction = useCallback((options = {}) => {
    setConfirmState({
      title: options.title || 'Are you sure?',
      message: options.message || 'Please confirm this action.',
      confirmLabel: options.confirmLabel || 'Confirm',
      cancelLabel: options.cancelLabel || 'Cancel',
      variant: options.variant || 'primary',
    })

    return new Promise((resolve) => {
      confirmResolver.current = resolve
    })
  }, [])

  const closeConfirm = useCallback((result) => {
    setConfirmState(null)
    if (confirmResolver.current) {
      confirmResolver.current(result)
      confirmResolver.current = null
    }
  }, [])

  useEffect(() => {
    if (!confirmState) return
    const onKey = (event) => {
      if (event.key === 'Escape') closeConfirm(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmState, closeConfirm])

  const value = useMemo(() => ({ notify, confirmAction }), [notify, confirmAction])

  return (
    <UIFeedbackContext.Provider value={value}>
      {children}

      <div className="toast-stack" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div className="toast-icon">{toastIcon(toast.type)}</div>
            <div className="toast-content">
              {toast.title && <div className="toast-title">{toast.title}</div>}
              <div className="toast-message">{toast.message}</div>
            </div>
            <button className="toast-close" type="button" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeConfirm(false) }}>
          <div className="modal confirm-modal" role="dialog" aria-modal="true">
            <div className={`confirm-mark confirm-${confirmState.variant}`}>
              <AlertTriangle size={24} />
            </div>
            <h2 className="modal-title" style={{ textAlign: 'center' }}>{confirmState.title}</h2>
            <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: 8 }}>{confirmState.message}</p>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" type="button" onClick={() => closeConfirm(false)}>
                {confirmState.cancelLabel}
              </button>
              <button
                className={`btn ${confirmState.variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                type="button"
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIFeedbackContext.Provider>
  )
}

export function useUIFeedback() {
  const ctx = useContext(UIFeedbackContext)
  if (!ctx) throw new Error('useUIFeedback must be used inside UIFeedbackProvider')
  return ctx
}
