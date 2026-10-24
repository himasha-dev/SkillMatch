import React, { createContext, useCallback, useContext, useState } from "react";
import { Briefcase, X } from "lucide-react";

export const DEGREES = ["Certificate", "Diploma", "Bachelor", "Master", "PhD"];

export const Tags = ({ items = [] }) => (
  <div className="tags">
    {items.map((x) => (
      <span key={x}>{x}</span>
    ))}
  </div>
);

export const Stat = ({ n, t }) => (
  <div className="card stat">
    <b>{n}</b>
    <span>{t}</span>
  </div>
);

export const Empty = ({ text }) => (
  <div className="empty card">
    <Briefcase />
    <p>{text}</p>
  </div>
);

// Label + control + inline error message
export const Field = ({ label, error, className = "", children }) => (
  <label className={`${className} ${error ? "invalid" : ""}`}>
    {label}
    {children}
    {error && <span className="fielderror">{error}</span>}
  </label>
);

export function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modalhead">
          <h2>{title}</h2>
          <button className="iconbtn dark" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ title, text, confirmLabel = "Delete", onConfirm, onCancel, busy }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p>{text}</p>
      <div className="row end">
        <button className="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button className="danger" onClick={onConfirm} disabled={busy}>
          {busy ? "Working..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const notify = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast((t) => (t && Date.now() - t.id >= 3900 ? null : t)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={notify}>
      {children}
      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          {toast.message}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
