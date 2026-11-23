'use client';
import { useState } from 'react';
import { useApp } from '../lib/store';
import { OUT } from '../lib/data';
import { btn2, box } from '../ui';

const REASONS = ['Contains personal details', 'Medically dangerous', 'Spam or fake'];

export default function JourneyCard({ x, withScore }) {
  const { doctors, saved, toggleSave, openThread, setModalDoc, reportCase } = useApp();
  const [reporting, setReporting] = useState(false);
  const doc = x.doc ? doctors[x.doc] : null;
  const mentor = x.src === 'patient' && x.open && x.out === 'improved';

  return (
    <div className={`${box} p-4 text-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">
            {x.cond}: {x.tx}
            {mentor && <span className="ml-2 rounded bg-teal-100 px-1.5 py-0.5 text-xs font-normal text-teal-900">Mentor</span>}
          </p>
          <p className="text-slate-500">{x.sym.join(', ')}</p>
          <p className="text-slate-500">{doc ? `Verified by ${doc.name}` : 'Shared by an anonymous patient'}. Outcome: {OUT[x.out]}</p>
        </div>
        {withScore && (
          <div className="w-24 shrink-0 text-right">
            <span className="font-serif text-lg">{Math.round(x.s * 100)}%</span>
            <div className="mt-1 h-1.5 rounded bg-slate-100"><div className="h-1.5 rounded bg-teal-700" style={{ width: `${x.s * 100}%` }} /></div>
            <span className="text-xs text-slate-500">similar</span>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => toggleSave(x.id)} aria-pressed={saved.includes(x.id)} className={btn2}>{saved.includes(x.id) ? 'Saved' : 'Save'}</button>
        {x.src === 'patient' && (x.open
          ? <button onClick={() => openThread(x.id)} className={btn2}>Message this peer</button>
          : <span className="text-xs text-slate-500">This member is not open to messages</span>)}
        {doc && <button onClick={() => setModalDoc(doc.id)} disabled={!doc.accepting} className={btn2}>{doc.accepting ? 'Request consultation' : 'Not accepting patients'}</button>}
        {!x.mine && (reporting ? (
          <span className="flex flex-wrap items-center gap-1 text-xs">
            Report as:
            {REASONS.map((r) => <button key={r} onClick={() => { reportCase(x.id, r); setReporting(false); }} className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50">{r}</button>)}
            <button onClick={() => setReporting(false)} className="px-1 underline">Cancel</button>
          </span>
        ) : <button onClick={() => setReporting(true)} className="ml-auto text-xs text-slate-500 underline">Report</button>)}
      </div>
    </div>
  );
}