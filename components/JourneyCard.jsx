'use client';
// One journey as a ruled row. Symptoms that match the current search are highlighted.
import { useState } from 'react';
import { useApp } from '../lib/store';
import { OUT } from '../lib/data';
import { btn2, lnk } from './ui';

const REASONS = ['Contains personal details', 'Medically dangerous', 'Spam or fake'];
const TAG = { improved: 'border-brand text-brand', partial: 'border-ink-soft text-ink-soft', none: 'border-rule text-ink-soft' };

export default function JourneyCard({ x }) {
  const { doctors, saved, toggleSave, openThread, setModalDoc, reportCase, searched } = useApp();
  const [reporting, setReporting] = useState(false);
  const mine = searched || [];
  const doc = x.doc ? doctors[x.doc] : null;
  const shared = x.sym.filter((s) => mine.includes(s)).length;
  const mentor = x.src === 'patient' && x.open && x.out === 'improved';
  const who = doc ? `Verified by ${doc.name}.` : mentor ? 'Anonymous patient who recovered and is open to questions.' : 'Anonymous patient.';

  return (
    <article className="py-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium">{x.cond}: <span className="font-normal">{x.tx}</span></h3>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${TAG[x.out]}`}>{x.out === 'none' ? 'No change' : OUT[x.out][0].toUpperCase() + OUT[x.out].slice(1)}</span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Symptoms">
        {x.sym.map((s) => {
          const hit = mine.includes(s);
          return (
            <li key={s} className={`rounded px-2 py-0.5 text-sm ${hit ? 'bg-hl text-ink' : 'border border-rule text-ink-soft'}`}>
              {s}{hit && <span className="sr-only"> (matches yours)</span>}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-sm text-ink-soft">{mine.length > 0 && <>Shares <b className="font-medium text-ink">{shared} of your {mine.length}</b> symptoms. </>}{who}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {doc && <button onClick={() => setModalDoc(doc.id)} disabled={!doc.accepting} className={`${btn2} !min-h-10`}>{doc.accepting ? 'Request consultation' : 'Not accepting patients'}</button>}
        {x.src === 'patient' && (x.open
          ? <button onClick={() => openThread(x.id)} className={`${btn2} !min-h-10`}>Message this peer</button>
          : <span className="text-sm text-ink-soft">Not open to messages</span>)}
        <button onClick={() => toggleSave(x.id)} aria-pressed={saved.includes(x.id)} className={lnk}>{saved.includes(x.id) ? 'Saved' : 'Save'}</button>
        {!x.mine && (reporting ? (
          <span className="ml-auto flex flex-wrap items-center gap-1 text-xs">
            Report as:
            {REASONS.map((r) => <button key={r} onClick={() => { reportCase(x.id, r); setReporting(false); }} className="min-h-10 rounded border border-rule px-2 hover:bg-mist">{r}</button>)}
            <button onClick={() => setReporting(false)} className="min-h-10 px-1 underline">Cancel</button>
          </span>
        ) : <button onClick={() => setReporting(true)} className="ml-auto min-h-10 text-xs text-ink-soft underline">Report</button>)}
      </div>
    </article>
  );
}
