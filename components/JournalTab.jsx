'use client';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { todayStr, dayDiff, fmtDate } from '../lib/data';
import { Chips, btn, btn2, lnk, inp, box, h1, h2, Empty, useDraft } from './ui';

const ms = (d) => new Date(`${d}T00:00:00`).getTime();
const avg = (a) => (a.length ? a.reduce((s, e) => s + e.sev, 0) / a.length : null);
const f1 = (n) => (n === null ? 'n/a' : n.toFixed(1));

function Chart({ entries }) {
  const W = 560, H = 170, L = 28, R = 10, T = 10, B = 24;
  const n = entries.length, d0 = ms(entries[0].date), d1 = ms(entries[n - 1].date);
  const x = (e) => (d1 === d0 ? L + (W - L - R) / 2 : L + ((ms(e.date) - d0) / (d1 - d0)) * (W - L - R));
  const y = (v) => T + (1 - v / 10) * (H - T - B);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Symptom severity from ${fmtDate(entries[0].date)} to ${fmtDate(entries[n - 1].date)}`} className="w-full">
      {[0, 5, 10].map((v) => (
        <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#D5DDE3" /><text x={L - 6} y={y(v) + 4} fontSize="11" textAnchor="end" fill="#4B5C66">{v}</text></g>
      ))}
      <polyline fill="none" stroke="#34408F" strokeWidth="2" points={entries.map((e) => `${x(e)},${y(e.sev)}`).join(' ')} />
      {entries.map((e) => <circle key={e.id} cx={x(e)} cy={y(e.sev)} r="3.5" fill="#34408F"><title>{fmtDate(e.date)}: {e.sev}/10</title></circle>)}
      <text x={L} y={H - 6} fontSize="11" fill="#4B5C66">{fmtDate(entries[0].date)}</text>
      {n > 1 && <text x={W - R} y={H - 6} fontSize="11" textAnchor="end" fill="#4B5C66">{fmtDate(entries[n - 1].date)}</text>}
    </svg>
  );
}

export default function JournalTab() {
  const { journal, addJournal, removeJournal, loadSampleJournal, clearJournal, search, go, setShareDraft, notify } = useApp();
  const [f, setF, resetF] = useDraft('journal', { sev: null, sym: [], tx: '', note: '' });
  const [date, setDate] = useState('');
  useEffect(() => { setDate(todayStr()); }, []);

  const entries = useMemo(() => [...journal].sort((a, b) => a.date.localeCompare(b.date)), [journal]);
  const stats = useMemo(() => {
    if (!entries.length) return null;
    const latest = entries[entries.length - 1].date;
    const recent = entries.filter((e) => dayDiff(latest, e.date) < 7);
    const prev = entries.filter((e) => dayDiff(latest, e.date) >= 7 && dayDiff(latest, e.date) < 14);
    const count = {};
    entries.forEach((e) => e.sym.forEach((s) => (count[s] = (count[s] || 0) + 1)));
    const top = Object.entries(count).sort((a, b) => b[1] - a[1]).map(([s]) => s).slice(0, 4);
    const key = (e) => e.tx.trim().toLowerCase();
    const names = [...new Set(entries.map(key).filter(Boolean))];
    const tx = names.map((t) => {
      const on = entries.filter((e) => key(e) === t), off = entries.filter((e) => key(e) !== t);
      return { t, days: on.length, a: avg(on), b: avg(off) };
    });
    return { recent: avg(recent), prev: prev.length ? avg(prev) : null, top, tx };
  }, [entries]);

  const submit = (e) => {
    e.preventDefault();
    if (f.sev === null || !date) return;
    const updating = journal.some((x) => x.date === date);
    addJournal({ id: Date.now(), date, sev: Number(f.sev), sym: f.sym, tx: f.tx.trim(), note: f.note.trim() });
    resetF();
    notify(updating ? 'Entry for that day updated' : 'Entry saved');
  };

  return (
    <div className="space-y-10">
      <section className="max-w-2xl">
        <h1 className={h1}>How are you today?</h1>
        <p className="mt-2 text-ink-soft">A private daily log. It never appears in search unless you choose to turn it into a shared journey.</p>
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div role="radiogroup" aria-label="Severity today, 0 is none and 10 is the worst">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} type="button" role="radio" aria-checked={f.sev === i} onClick={() => setF({ ...f, sev: i })}
                  className={`h-11 w-11 rounded-md border text-base ${f.sev === i ? 'border-brand bg-brand text-white' : 'border-rule bg-white hover:border-brand'}`}>{i}</button>
              ))}
            </div>
            <p className="mt-1 flex justify-between text-sm text-ink-soft" style={{ maxWidth: '31rem' }}><span>None</span><span>Worst</span></p>
          </div>
          <div>
            <p className="mb-2 text-sm text-ink-soft">What are you noticing?</p>
            <Chips picked={f.sym} setPicked={(sym) => setF({ ...f, sym })} />
          </div>
          <details className="text-sm">
            <summary className="min-h-10 cursor-pointer py-2 text-brand underline underline-offset-2">Add treatment, note or change the date</summary>
            <div className="mt-2 space-y-3">
              <input aria-label="Treatment or routine today" className={inp} placeholder="Treatment or routine today (optional)" value={f.tx} onChange={(e) => setF({ ...f, tx: e.target.value })} />
              <input aria-label="Note" className={inp} placeholder="Note (optional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
              <label className="block">Date<input type="date" className={`${inp} mt-1 max-w-xs`} value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} /></label>
            </div>
          </details>
          <div className="flex flex-wrap items-center gap-3">
            <button className={btn} disabled={f.sev === null || !date}>Save today</button>
            {!entries.length && <button type="button" onClick={loadSampleJournal} className={btn2}>Load sample data</button>}
          </div>
        </form>
      </section>

      {!entries.length && <Empty>No entries yet. Pick a number above, or load sample data to see how the trend works.</Empty>}

      {entries.length > 0 && (<>
        <section>
          <p className="font-serif text-2xl leading-snug md:text-3xl" data-testid="trend">
            Your 7-day average is {f1(stats.recent)}
            {stats.prev !== null ? `, ${stats.recent < stats.prev ? 'down from' : stats.recent > stats.prev ? 'up from' : 'the same as'} ${f1(stats.prev)} the week before.` : '. Add more days to compare weeks.'}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{stats.prev !== null && stats.recent < stats.prev ? 'Lower is better, so this is improving.' : 'Lower numbers mean fewer symptoms.'}</p>
          <div className={`${box} mt-4 p-4`}><Chart entries={entries} /></div>
        </section>

        <div className="grid gap-10 md:grid-cols-2">
          <section>
            <h2 className={h2}>Most frequent symptoms</h2>
            <p className="mt-2">{stats.top.join(', ') || 'None logged'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button disabled={!stats.top.length} onClick={() => { search(stats.top); go('find'); }} className={btn2}>Search journeys like mine</button>
              <button disabled={!stats.top.length} onClick={() => { setShareDraft({ sym: stats.top, tx: stats.tx.at(-1)?.t || '' }); go('share'); }} className={btn2}>Turn into a shared journey</button>
            </div>
          </section>
          <section>
            <h2 className={h2}>Treatments you logged</h2>
            {!stats.tx.length && <p className="mt-2 text-ink-soft">Log a treatment on any day to compare.</p>}
            {stats.tx.map((t) => (
              <p key={t.t} className="mt-2 text-sm">
                <b className="font-medium">{t.t}</b>: {t.days} {t.days === 1 ? 'day' : 'days'}. Average severity {f1(t.a)} with it, {f1(t.b)} without.
                {t.days < 5 && <span className="ml-2 rounded-full border border-ink-soft px-2 py-0.5 text-xs">Too few days to trust</span>}
              </p>
            ))}
            <p className="mt-2 text-xs text-ink-soft">This shows what happened alongside a treatment, not what caused it. Symptoms also change on their own.</p>
          </section>
        </div>

        <section>
          <div className="flex items-center justify-between"><h2 className={h2}>Entries</h2><button onClick={clearJournal} className={lnk}>Clear all</button></div>
          <ul className="mt-2 max-h-72 divide-y divide-rule overflow-y-auto border-y border-rule text-sm">
            {[...entries].reverse().map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 py-2">
                <span><span className="font-medium">{fmtDate(e.date)}</span>, severity {e.sev}/10. {e.sym.join(', ') || 'No symptoms picked'}.{e.tx && <> Treatment: {e.tx}.</>}{e.note && <> “{e.note}”</>}</span>
                <button onClick={() => removeJournal(e.id)} className={`${lnk} shrink-0`} aria-label={`Delete entry for ${fmtDate(e.date)}`}>Delete</button>
              </li>
            ))}
          </ul>
        </section>
      </>)}
    </div>
  );
}
