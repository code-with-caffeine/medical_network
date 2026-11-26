'use client';
// Shared class strings and small UI pieces.
import { useEffect, useState } from 'react';
import { SYMPTOMS } from '../lib/data';
import { useApp } from '../lib/store';

export const h1 = 'font-serif text-4xl leading-tight md:text-5xl';
export const h2 = 'font-serif text-2xl leading-snug';
export const inp = 'w-full min-h-11 rounded-md border border-rule bg-white px-3 py-2 text-base text-ink placeholder:text-ink-soft/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';
export const btn = 'inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40 disabled:hover:bg-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';
export const btn2 = 'inline-flex min-h-11 items-center justify-center rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand/5 disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';
export const lnk = 'inline-flex min-h-10 items-center text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-dark disabled:opacity-40 disabled:no-underline';
export const box = 'rounded-lg border border-rule bg-white';

export function Chips({ picked, setPicked }) {
  const toggle = (s) => setPicked(picked.includes(s) ? picked.filter((x) => x !== s) : [...picked, s]);
  return (
    <div className="flex flex-wrap gap-2">
      {SYMPTOMS.map((s) => (
        <button key={s} type="button" onClick={() => toggle(s)} aria-pressed={picked.includes(s)}
          className={`min-h-11 rounded-full border px-4 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${picked.includes(s) ? 'border-brand bg-brand text-white' : 'border-rule bg-white text-ink hover:border-brand'}`}>
          {s}
        </button>
      ))}
    </div>
  );
}

const STATUS = {
  pending: 'border-ink-soft text-ink-soft', accepted: 'border-brand text-brand', verified: 'border-brand text-brand',
  declined: 'border-rule text-ink-soft', rejected: 'border-red-700 text-red-800',
};
export const Status = ({ s }) => <span className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS[s] || STATUS.declined}`}>{s}</span>;

export function Bar({ pct }) {
  return <div className="h-1.5 rounded bg-rule"><div className="h-1.5 rounded bg-brand" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>;
}

export const Empty = ({ children }) => <p className="text-ink-soft">{children}</p>;

export function BackLink({ to = 'find', children }) {
  const { go } = useApp();
  return (
    <button onClick={() => go(to)} className={`${lnk} -ml-1 mb-2 gap-1 no-underline hover:underline`}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
      {children}
    </button>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl bg-white p-5 sm:rounded-xl">
        {children}
      </div>
    </div>
  );
}

export function Toast() {
  const { toast, dismissToast } = useApp();
  if (!toast) return null;
  return (
    <div role="status" className="fixed bottom-20 left-1/2 z-40 flex w-max max-w-[92vw] -translate-x-1/2 items-center gap-4 rounded-md bg-ink px-4 py-2.5 text-sm text-white shadow-lg md:bottom-6">
      <span>{toast.msg}</span>
      {toast.action && (
        <button onClick={() => { toast.action.fn(); dismissToast(); }} className="min-h-9 font-medium underline underline-offset-2">{toast.action.label}</button>
      )}
    </div>
  );
}

// Form state that survives a refresh. `volatile` keys (like consent boxes) always start fresh.
export function useDraft(key, initial, volatile = []) {
  const [v, setV] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`mm-draft-${key}`);
      if (raw) {
        const d = JSON.parse(raw);
        volatile.forEach((k) => { d[k] = initial[k]; });
        setV({ ...initial, ...d });
      }
    } catch {}
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(`mm-draft-${key}`, JSON.stringify(v)); } catch {}
  }, [loaded, key, v]);
  const reset = () => { setV(initial); try { localStorage.removeItem(`mm-draft-${key}`); } catch {} };
  return [v, setV, reset];
}
