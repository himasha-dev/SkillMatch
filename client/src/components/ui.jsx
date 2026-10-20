import React from "react";
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
