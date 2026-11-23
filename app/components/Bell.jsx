'use client';
import { useState } from 'react';
import { useApp } from '../lib/store';
import { time } from '../lib/data';

export default function Bell() {
  const { notes, markNotesRead } = useApp();
  const [open, setOpen] = useState(false);
  const unread = notes.filter((n) => !n.read).length;
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Notifications, ${unread} unread`}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
        Notifications{unread > 0 && <span className="ml-2 rounded-full bg-teal-800 px-1.5 text-xs text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 max-w-[85vw] rounded-lg border border-slate-200 bg-white p-3 shadow">
          {notes.length === 0 && <p className="text-sm text-slate-600">Nothing yet. Updates on requests and messages appear here.</p>}
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {notes.map((n) => (
              <li key={n.id} className={`rounded px-2 py-1.5 text-sm ${n.read ? 'text-slate-600' : 'bg-teal-50 text-teal-950'}`}>{n.text}<span className="ml-2 text-[10px] opacity-60">{time(n.ts)}</span></li>
            ))}
          </ul>
          {unread > 0 && <button onClick={markNotesRead} className="mt-2 text-xs underline">Mark all as read</button>}
        </div>
      )}
    </div>
  );
}