'use client';
import { useEffect } from 'react';
import { useApp } from '../lib/store';
import { OUT } from '../lib/data';
import { Chips, btn, lnk, inp, h1, h2, BackLink, useDraft } from './ui';

const BLANK = { cond: '', tx: '', out: 'improved', sym: [], open: true, consent: false };

export default function ShareTab() {
  const { cases, addCase, removeCase, notify, shareDraft, setShareDraft, searched } = useApp();
  const [f, setF, resetF] = useDraft('share', BLANK, ['consent']);
  const mine = cases.filter((x) => x.mine);
  const valid = f.cond.trim() && f.tx.trim() && f.sym.length && f.consent;

  // The journal can hand over a prefilled draft.
  useEffect(() => {
    if (shareDraft) { setF((x) => ({ ...x, ...shareDraft })); setShareDraft(null); }
  }, [shareDraft, setShareDraft, setF]);

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    addCase({ id: Date.now(), src: 'patient', mine: true, doc: null, cond: f.cond.trim(), sym: f.sym, tx: f.tx.trim(), out: f.out, open: f.open, alias: 'You' });
    resetF();
    notify('Journey shared anonymously. Thank you.');
  };

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <section>
        <BackLink to="find">{searched ? 'Back to results' : 'Back to Find'}</BackLink>
        <h1 className={h1}>Share your journey</h1>
        <p className="mt-2 text-ink-soft">Anonymous, and your draft is saved as you type.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <input aria-label="Diagnosis" className={inp} placeholder="Diagnosis (for example, POTS)" value={f.cond} onChange={(e) => setF({ ...f, cond: e.target.value })} />
          <div><p className="mb-2 text-sm text-ink-soft">Symptoms you had</p><Chips picked={f.sym} setPicked={(sym) => setF({ ...f, sym })} /></div>
          <input aria-label="What you tried" className={inp} placeholder="What you tried" value={f.tx} onChange={(e) => setF({ ...f, tx: e.target.value })} />
          <select aria-label="Outcome" className={inp} value={f.out} onChange={(e) => setF({ ...f, out: e.target.value })}>
            <option value="improved">Improved</option><option value="partial">Partly improved</option><option value="none">No change</option>
          </select>
          <label className="flex gap-2 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={f.open} onChange={(e) => setF({ ...f, open: e.target.checked })} /> Let people with similar symptoms message me</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} /> I agree to share this without my name or other identifying details.</label>
          <button className={btn} disabled={!valid}>Share journey</button>
        </form>
      </section>
      <section className="md:pt-12">
        <h2 className={h2}>Your shared journeys</h2>
        {mine.length === 0 && <p className="mt-2 text-ink-soft">Nothing shared yet. Your journey helps others with the same symptoms.</p>}
        <ul className="mt-2 divide-y divide-rule border-y border-rule empty:hidden">
          {mine.map((x) => (
            <li key={x.id} className="py-3 text-sm">
              <p className="font-medium">{x.cond}: {x.tx}</p>
              <p className="text-ink-soft">{x.sym.join(', ')}. Outcome: {OUT[x.out]}. Messages {x.open ? 'on' : 'off'}.</p>
              <button onClick={() => removeCase(x.id, 'Journey deleted')} className={lnk}>Delete</button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-soft">Your own journeys are hidden from your own search results.</p>
      </section>
    </div>
  );
}
