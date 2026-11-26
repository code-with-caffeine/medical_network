'use client';
// Top bar (desktop), bottom tab bar (phones), and the "your search" strip.
import { useApp } from '../lib/store';
import Bell from './Bell';

const PATHS = {
  find: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  journal: <><path d="M6 4h11a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  messages: <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />,
  doctors: <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" />,
  requests: <><path d="M5 13 7 5h10l2 8v6H5z" /><path d="M5 13h4l1.5 3h3L15 13h4" /></>,
  cases: <><path d="M9 4h6v3H9z" /><path d="M7 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1" /><path d="M9 12h6M9 16h4" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></>,
};
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PATHS[name]}</svg>
);

const PATIENT = [['find', 'Find', 'find'], ['journal', 'Journal', 'journal'], ['messages', 'Messages', 'messages'], ['doctors', 'Doctors', 'doctors']];
const DOCTOR = [['d/requests', 'Requests', 'requests'], ['d/cases', 'Cases', 'cases'], ['d/profile', 'Profile', 'profile']];

function useNav() {
  const { route, mode, unread, requests, me } = useApp();
  const unreadCount = Object.values(unread).filter(Boolean).length + requests.filter((r) => r.status !== 'pending' && r.seen === false).length;
  const pending = requests.filter((r) => r.doc === me && r.status === 'pending').length;
  const items = mode === 'doctor' ? DOCTOR : PATIENT;
  const active = (id) => route === id || (id === 'find' && (route === 'insights' || route === 'share'));
  const badge = (id) => (id === 'messages' ? unreadCount : id === 'd/requests' ? pending : 0);
  return { items, active, badge };
}

const Badge = ({ n }) => n > 0 ? <span className="ml-1.5 min-w-5 rounded-full bg-brand px-1.5 text-center text-xs text-white" aria-label={`${n} new`}>{n}</span> : null;

export function TopBar() {
  const { mode, go } = useApp();
  const { items, active, badge } = useNav();
  return (
    <header className="sticky top-0 z-20 border-b border-rule bg-mist/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4">
        <button onClick={() => go(mode === 'doctor' ? 'd/requests' : 'find')} className="inline-flex min-h-11 items-center font-serif text-2xl text-ink">MedMatch</button>
        <nav aria-label="Main" className="ml-4 hidden gap-1 md:flex">
          {items.map(([id, label]) => (
            <button key={id} onClick={() => go(id)} aria-current={active(id) ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium ${active(id) ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}>
              {label}<Badge n={badge(id)} />
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => go(mode === 'doctor' ? 'find' : 'd/requests')} className="min-h-11 rounded-md px-3 text-sm font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline">
            {mode === 'doctor' ? 'Patient view' : "I'm a doctor"}
          </button>
          <Bell />
        </div>
      </div>
    </header>
  );
}

export function BottomBar() {
  const { go } = useApp();
  const { items, active, badge } = useNav();
  return (
    <nav aria-label="Main (mobile)" className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-white md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(([id, label, icon]) => (
          <button key={id} onClick={() => go(id)} aria-current={active(id) ? 'page' : undefined}
            className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${active(id) ? 'text-brand' : 'text-ink-soft'}`}>
            <Icon name={icon} />{label}
            {badge(id) > 0 && <span className="absolute right-[28%] top-1.5 min-w-5 rounded-full bg-brand px-1 text-center text-xs text-white" aria-label={`${badge(id)} new`}>{badge(id)}</span>}
          </button>
        ))}
      </div>
    </nav>
  );
}

// Keeps the current search visible on every other screen.
export function SearchStrip() {
  const { route, mode, searched, picked, go } = useApp();
  const list = searched || picked;
  if (route === 'find' || mode === 'doctor' || !list.length) return null;
  return (
    <div className="border-b border-rule bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-1.5 text-sm">
        <span className="min-w-0 truncate text-ink-soft">Your search: <span className="text-ink">{list.slice(0, 2).join(', ')}{list.length > 2 ? ` and ${list.length - 2} more` : ''}</span></span>
        <button onClick={() => go('find')} className="min-h-10 shrink-0 font-medium text-brand underline underline-offset-2">Edit search</button>
      </div>
    </div>
  );
}
