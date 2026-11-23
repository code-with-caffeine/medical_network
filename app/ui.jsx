'use client';
// Small shared UI pieces and class strings.
import { useEffect } from 'react';
import { SYMPTOMS } from './lib/data';

export const inp = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700';
export const btn = 'rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
export const btn2 = 'rounded-md border border-teal-800 px-3 py-1.5 text-sm text-teal-900 hover:bg-teal-50 disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700';
export const box = 'rounded-lg border border-slate-200 bg-white';

export function Chips({ picked, setPicked }) {
  const toggle = (s) => setPicked(picked.includes(s) ? picked.filter((x) => x !== s) : [...picked, s]);
  return (
    <div className="flex flex-wrap gap-2">
      {SYMPTOMS.map((s) => (
        <button key={s} type="button" onClick={() => toggle(s)} aria-pressed={picked.includes(s)}
          className={`rounded-full border px-3 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${picked.includes(s) ? 'border-teal-800 bg-teal-800 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-teal-700'}`}>
          {s}
        </button>
      ))}
    </div>
  );
}

const STATUS = {
  pending: 'bg-amber-100 text-amber-800', accepted: 'bg-teal-100 text-teal-900', verified: 'bg-teal-100 text-teal-900',
  declined: 'bg-slate-200 text-slate-700', rejected: 'bg-red-100 text-red-800',
};
export const Status = ({ s }) => <span className={`rounded px-2 py-0.5 text-xs ${STATUS[s] || STATUS.declined}`}>{s}</span>;

export function Bar({ pct }) {
  return <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-teal-700" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>;
}

export const Empty = ({ children }) => <p className="text-sm text-slate-600">{children}</p>;

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5">
        {children}
      </div>
    </div>
  );
}