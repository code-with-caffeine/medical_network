'use client';
// Demo-only admin: doctor verification, moderation queue, product ideas and data reset.
// In production this would be a separate, access-controlled tool.
import { useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '../../lib/store';
import IdeasTab from '../../components/IdeasTab';
import { btn, btn2, h1, h2, Empty, Status } from '../../components/ui';

export default function Admin() {
  const { doctors, cases, reports, route, approveDoctor, resolveReport, resetDemo } = useApp();
  useEffect(() => { document.title = 'Admin | MedMatch'; }, []);
  const pending = Object.values(doctors).filter((d) => d.status === 'pending');
  const open = reports.filter((r) => r.status === 'open');
  const all = Object.values(doctors);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={h1}>Admin</h1>
        <Link href={`/#/${route}`} className={btn2}>Back to the app</Link>
      </div>
      <p className="mt-2 max-w-xl text-ink-soft">Demo tools. Use this page to approve doctors, review reports and reset the demo data.</p>

      <section className="mt-10">
        <h2 className={h2}>Doctor applications</h2>
        {pending.length === 0 && <div className="mt-2"><Empty>No pending applications. Register a doctor from the doctor workspace to test this.</Empty></div>}
        <ul className="mt-2 divide-y divide-rule border-y border-rule">
          {pending.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span><b className="font-medium">{d.name}</b>, {d.spec}, {d.city}. Licence {d.licence}</span>
              <span className="flex gap-2"><button onClick={() => approveDoctor(d.id, true)} className={btn}>Verify</button><button onClick={() => approveDoctor(d.id, false)} className={btn2}>Reject</button></span>
            </li>
          ))}
        </ul>
        <details className="mt-3 text-sm">
          <summary className="min-h-10 cursor-pointer py-2 text-brand underline underline-offset-2">All doctors ({all.length})</summary>
          <ul className="divide-y divide-rule border-y border-rule">
            {all.map((d) => <li key={d.id} className="flex items-center justify-between gap-3 py-2"><span>{d.name}, {d.city}</span><Status s={d.status} /></li>)}
          </ul>
        </details>
      </section>

      <section className="mt-10">
        <h2 className={h2}>Reported journeys</h2>
        {open.length === 0 && <div className="mt-2"><Empty>No open reports.</Empty></div>}
        <ul className="mt-2 divide-y divide-rule border-y border-rule">
          {open.map((r) => {
            const k = cases.find((x) => x.id === r.caseId);
            if (!k) return null;
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span><b className="font-medium">{r.reason}</b>: {k.cond}, {k.tx}</span>
                <span className="flex gap-2"><button onClick={() => resolveReport(r.id, 'remove')} className={btn}>Remove journey</button><button onClick={() => resolveReport(r.id, 'keep')} className={btn2}>Keep visible</button></span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-10"><IdeasTab /></div>

      <section className="mt-10">
        <h2 className={h2}>Demo data</h2>
        <p className="mt-1 text-sm text-ink-soft">Everything is stored in this browser only.</p>
        <button onClick={() => confirm('Reset all demo data in this browser?') && resetDemo()} className={`mt-3 ${btn2}`}>Reset demo data</button>
      </section>
    </main>
  );
}
