'use client';
import { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import { OUT } from '../lib/data';
import { Chips, btn, inp, box, Empty } from '../ui';

const BLANK = { cond: '', tx: '', out: 'improved', sym: [], open: true, consent: false };

export default function ShareTab() {
  const { cases, addCase, removeCase, notify, shareDraft, setShareDraft } = useApp();
  const [f, setF] = useState(BLANK);
  const mine = cases.filter((x) => x.mine);
  const valid = f.cond.trim() && f.tx.trim() && f.sym.length && f.consent;

  // The journal tab can hand over a prefilled draft.
  useEffect(() => {
    if (shareDraft) { setF((x) => ({ ...x, ...shareDraft })); setShareDraft(null); }
  }, [shareDraft, setShareDraft]);

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    addCase({ id: Date.now(), src: 'patient', mine: true, doc: null, cond: f.cond.trim(), sym: f.sym, tx: f.tx.trim(), out: f.out, open: f.open, alias: 'You' });
    setF(BLANK);
    notify('Journey shared anonymously. Thank you.');
  };

  return (
    <section className="mt-6 grid gap-6 md:grid-cols-2">
      <form onSubmit={submit} className={`${box} space-y-3 p-5`}>
        <h2 className="font-medium">Share your journey anonymously</h2>
        <input aria-label="Diagnosis" className={inp} placeholder="Diagnosis (e.g. POTS)" value={f.cond} onChange={(e) => setF({ ...f, cond: e.target.value })} />
        <Chips picked={f.sym} setPicked={(sym) => setF({ ...f, sym })} />
        <input aria-label="What you tried" className={inp} placeholder="What you tried" value={f.tx} onChange={(e) => setF({ ...f, tx: e.target.value })} />
        <select aria-label="Outcome" className={inp} value={f.out} onChange={(e) => setF({ ...f, out: e.target.value })}>
          <option value="improved">Improved</option><option value="partial">Partly improved</option><option value="none">No change</option>
        </select>
        <label className="flex gap-2 text-xs text-slate-600"><input type="checkbox" checked={f.open} onChange={(e) => setF({ ...f, open: e.target.checked })} /> Let people with similar symptoms message me</label>
        <label className="flex gap-2 text-xs text-slate-600"><input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} /> I agree to share this without my name or other identifying details.</label>
        <button className={btn} disabled={!valid}>Share journey</button>
      </form>
      <div>
        <h2 className="mb-2 font-medium">Your shared journeys</h2>
        {mine.length === 0 && <Empty>Nothing shared yet. Your journeys help others with the same symptoms.</Empty>}
        <div className="space-y-2">
          {mine.map((x) => (
            <div key={x.id} className={`${box} p-4 text-sm`}>
              <p className="font-medium">{x.cond}: {x.tx}</p>
              <p className="text-slate-500">{x.sym.join(', ')}. Outcome: {OUT[x.out]}. Messages {x.open ? 'on' : 'off'}.</p>
              <button onClick={() => { removeCase(x.id); notify('Removed'); }} className="mt-2 text-xs text-slate-600 underline">Delete</button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">Your own journeys are hidden from your own search results.</p>
      </div>
    </section>
  );
}