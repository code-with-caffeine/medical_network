'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { time } from '../lib/data';

// The panel closes on outside click, Esc and any navigation, so it never covers the nav.
export default function Bell() {
  const { notes, markNotesRead, route } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unread = notes.filter((n) => !n.read).length;

  useEffect(() => { setOpen(false); }, [route]);
  useEffect(() => {
    if (!open) return;
    const away = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Notifications, ${unread} unread`}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15z" /><path d="M10 21h4" /></svg>
        {unread > 0 && <span className="absolute right-1 top-1 min-w-5 rounded-full bg-brand px-1 text-center text-xs text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-rule bg-white p-3 shadow-lg">
          {notes.length === 0 && <p className="text-sm text-ink-soft">Nothing yet. Updates on requests and messages appear here.</p>}
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {notes.map((n) => (
              <li key={n.id} className={`rounded px-2 py-2 text-sm ${n.read ? 'text-ink-soft' : 'bg-mist font-medium text-ink'}`}>{n.text}<span className="ml-2 text-xs font-normal text-ink-soft">{time(n.ts)}</span></li>
            ))}
          </ul>
          {unread > 0 && <button onClick={markNotesRead} className="mt-2 min-h-10 text-sm text-brand underline">Mark all as read</button>}
        </div>
      )}
    </div>
  );
}
