'use client';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { todayStr, dayDiff, fmtDate } from '../lib/data';
import { Chips, btn, btn2, inp, box, Empty } from '../ui';

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
        <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e2e8f0" /><text x={L - 6} y={y(v) + 4} fontSize="10" textAnchor="end" fill="#64748b">{v}</text></g>
      ))}
      <polyline fill="none" stroke="#0f766e" strokeWidth="2" points={entries.map((e) => `${x(e)},${y(e.sev)}`).join(' ')} />
      {entries.map((e) => <circle key={e.id} cx={x(e)} cy={y(e.sev)} r="3.5" fill="#0f766e"><title>{fmtDate(e.date)}: {e.sev}/10</title></circle>)}
      <text x={L} y={H - 6} fontSize="10" fill="#64748b">{fmtDate(entries[0].date)}</text>
      {n > 1 && <text x={W - R} y={H - 6} fontSize="10" textAnchor="end" fill="#64748b">{fmtDate(entries[n - 1].date)}</text>}
    </svg>
  );
}

export default function JournalTab() {
  const { journal, addJournal, removeJournal, loadSampleJournal, clearJournal, setPicked, setTab, setShareDraft, notify } = useApp();
  const [f, setF] = useState({ date: '', sev: 5, sym: [], tx: '', note: '' });
  useEffect(() => { setF((x) => ({ ...x, date: todayStr() })); }, []);

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
    if (!f.date) return;
    addJournal({ id: Date.now(), date: f.date, sev: Number(f.sev), sym: f.sym, tx: f.tx.trim(), note: f.note.trim() });
    setF({ ...f, sym: [], tx: '', note: '' });
    notify('Entry saved');
  };

  return (
    <section className="mt-6 space-y-6">
      <p className="max-w-xl text-sm text-slate-600">Log how you feel each day. Your journal is private. It never appears in search results unless you choose to turn it into a shared journey.</p>
      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={submit} className={`${box} space-y-3 p-5`}>
          <h2 className="font-medium">Today's entry</h2>
          <label className="block text-sm">Date<input type="date" className={`${inp} mt-1`} value={f.date} max={todayStr()} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
          <label className="block text-sm">Overall severity: <b>{f.sev}/10</b>
            <input type="range" min="0" max="10" className="mt-1 w-full" value={f.sev} onChange={(e) => setF({ ...f, sev: e.target.value })} />
          </label>
          <Chips picked={f.sym} setPicked={(sym) => setF({ ...f, sym })} />
          <input aria-label="Treatment taken today" className={inp} placeholder="Treatment or routine today (optional)" value={f.tx} onChange={(e) => setF({ ...f, tx: e.target.value })} />
          <input aria-label="Note" className={inp} placeholder="Note (optional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <div className="flex flex-wrap items-center gap-3">
            <button className={btn} disabled={!f.date}>Save entry</button>
            {!entries.length && <button type="button" onClick={loadSampleJournal} className={btn2}>Load sample data</button>}
          </div>
        </form>

        <div className={`${box} p-5`}>
          <h2 className="mb-2 font-medium">Your trend</h2>
          {!entries.length ? <Empty>No entries yet. Add one, or load sample data to see how the chart works.</Empty> : (<>
            <Chart entries={entries} />
            <p className="mt-2 text-sm" data-testid="trend">
              Last 7 days average: <b>{f1(stats.recent)}</b>.
              {stats.prev !== null ? <> Previous 7 days: <b>{f1(stats.prev)}</b> ({stats.recent < stats.prev ? 'lower is better, so you are improving' : stats.recent > stats.prev ? 'higher, so symptoms are worse' : 'no change'}).</> : ' Add more days to see a comparison.'}
            </p>
          </>)}
        </div>
      </div>

      {entries.length > 0 && (<>
        <div className="grid gap-6 md:grid-cols-2">
          <div className={`${box} p-5`}>
            <h2 className="mb-2 font-medium">Most frequent symptoms</h2>
            <p className="text-sm">{stats.top.join(', ') || 'None logged'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button disabled={!stats.top.length} onClick={() => { setPicked(stats.top); setTab('find'); notify('Symptoms copied. Press Find similar journeys.'); }} className={btn2}>Search journeys like mine</button>
              <button disabled={!stats.top.length} onClick={() => { setShareDraft({ sym: stats.top, tx: stats.tx.at(-1)?.t || '' }); setTab('share'); }} className={btn2}>Turn into a shared journey</button>
            </div>
          </div>
          <div className={`${box} p-5`}>
            <h2 className="mb-2 font-medium">Treatments you logged</h2>
            {!stats.tx.length && <Empty>Log a treatment on any day to compare.</Empty>}
            {stats.tx.map((t) => (
              <p key={t.t} className="mb-2 text-sm">
                <b>{t.t}</b>: {t.days} {t.days === 1 ? 'day' : 'days'}. Average severity {f1(t.a)} with it, {f1(t.b)} without.
                {t.days < 5 && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">Too few days to trust</span>}
              </p>
            ))}
            <p className="text-xs text-slate-500">This shows what happened alongside a treatment, not what caused it. Symptoms also change on their own.</p>
          </div>
        </div>

        <div className={`${box} p-5`}>
          <div className="mb-2 flex items-center justify-between"><h2 className="font-medium">Entries</h2><button onClick={() => { clearJournal(); notify('Journal cleared'); }} className="text-xs text-slate-600 underline">Clear all</button></div>
          <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto text-sm">
            {[...entries].reverse().map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-3 py-2">
                <div><span className="font-medium">{fmtDate(e.date)}</span>, severity {e.sev}/10. {e.sym.join(', ') || 'No symptoms picked'}{e.tx && <> Treatment: {e.tx}.</>}{e.note && <> “{e.note}”</>}</div>
                <button onClick={() => removeJournal(e.id)} className="shrink-0 text-xs text-slate-600 underline" aria-label={`Delete entry for ${fmtDate(e.date)}`}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      </>)}
    </section>
  );
}