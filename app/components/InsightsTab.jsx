'use client';
import { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { visibleCases, SCORE, rate } from '../lib/data';
import { box, Bar } from '../ui';

function Stacked({ list }) {
  const n = list.length || 1;
  const k = { improved: list.filter((x) => x.out === 'improved').length, partial: list.filter((x) => x.out === 'partial').length, none: list.filter((x) => x.out === 'none').length };
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded bg-slate-100" role="img" aria-label={`${k.improved} improved, ${k.partial} partly improved, ${k.none} no change`}>
        <div className="bg-teal-700" style={{ width: `${(k.improved / n) * 100}%` }} />
        <div className="bg-amber-400" style={{ width: `${(k.partial / n) * 100}%` }} />
        <div className="bg-slate-400" style={{ width: `${(k.none / n) * 100}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500">Improved {k.improved}, partly {k.partial}, no change {k.none}</p>
    </div>
  );
}

export default function InsightsTab() {
  const { cases, doctors, hidden } = useApp();
  const [cond, setCond] = useState('all');

  const d = useMemo(() => {
    const vis = visibleCases(cases, doctors, hidden);
    const by = {};
    vis.forEach((x) => (by[x.cond] ||= []).push(x));
    const groups = Object.entries(by).map(([name, list]) => {
      const dr = list.filter((x) => x.src === 'doctor'), pt = list.filter((x) => x.src === 'patient');
      return { name, list, n: list.length, rate: rate(list), dr: { n: dr.length, rate: rate(dr) }, pt: { n: pt.length, rate: rate(pt) } };
    }).sort((a, b) => b.n - a.n);
    const pool = cond === 'all' ? vis : vis.filter((x) => x.cond === cond);
    const tx = {};
    pool.forEach((x) => { const t = (tx[x.tx] ||= { name: x.tx, list: [], ver: 0 }); t.list.push(x); t.ver += x.src === 'doctor' ? 1 : 0; });
    const treatments = Object.values(tx).map((t) => ({ ...t, n: t.list.length, rate: rate(t.list) })).sort((a, b) => b.rate - a.rate || b.n - a.n);
    const sc = {};
    vis.forEach((x) => x.sym.forEach((s) => (sc[s] = (sc[s] || 0) + 1)));
    const symptoms = Object.entries(sc).sort((a, b) => b[1] - a[1]);
    return { vis, groups, treatments, symptoms };
  }, [cases, doctors, hidden, cond]);

  const maxSym = d.symptoms[0]?.[1] || 1;

  return (
    <section className="mt-6 space-y-6">
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        {[['Journeys on the platform', d.vis.length], ['Doctor-verified', d.vis.filter((x) => x.src === 'doctor').length], ['Conditions covered', d.groups.length]].map(([l, v]) => (
          <div key={l} className={`${box} p-4`}><p className="font-serif text-3xl">{v}</p><p className="text-slate-600">{l}</p></div>
        ))}
      </div>

      <div>
        <h2 className="mb-2 font-medium">Outcomes by condition</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {d.groups.map((g) => {
            const gap = g.dr.n && g.pt.n ? g.pt.rate - g.dr.rate : 0;
            return (
              <div key={g.name} className={`${box} p-4`}>
                <div className="flex justify-between text-sm"><span className="font-medium">{g.name}</span><span>{g.rate}% weighted improvement</span></div>
                <div className="mt-2"><Stacked list={g.list} /></div>
                <p className="mt-2 text-xs text-slate-600">Doctor-verified: {g.dr.n ? `${g.dr.rate}% (${g.dr.n})` : 'none'}. Self-reported: {g.pt.n ? `${g.pt.rate}% (${g.pt.n})` : 'none'}.</p>
                {Math.abs(gap) >= 20 && <p className="mt-1 rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">Sources disagree by {Math.abs(gap)} points. Self-reported results are {gap > 0 ? 'rosier' : 'gloomier'} than doctor-verified ones here.</p>}
                {g.n < 5 && <p className="mt-1 text-xs text-slate-500">Only {g.n} journeys so far.</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${box} p-5`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">Treatment leaderboard</h2>
          <select aria-label="Condition" className="rounded border border-slate-300 px-2 py-1 text-sm" value={cond} onChange={(e) => setCond(e.target.value)}>
            <option value="all">All conditions</option>{d.groups.map((g) => <option key={g.name}>{g.name}</option>)}
          </select>
        </div>
        <div className="space-y-3">
          {d.treatments.map((t) => (
            <div key={t.name} className="text-sm">
              <div className="flex justify-between gap-3"><span>{t.name}</span><span className="shrink-0">{t.rate}%, n={t.n}{t.n < 3 && <span className="ml-1 text-amber-700">(small sample)</span>}</span></div>
              <div className="mt-1"><Bar pct={t.rate} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${box} p-5`}>
        <h2 className="mb-3 font-medium">Most reported symptoms</h2>
        <div className="space-y-2">
          {d.symptoms.map(([s, n]) => (
            <div key={s} className="grid grid-cols-[9rem_1fr_2rem] items-center gap-3 text-sm"><span>{s}</span><Bar pct={(n / maxSym) * 100} /><span className="text-right text-slate-500">{n}</span></div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">Weighted improvement counts full improvement as 1, partial as 0.5 and no change as 0. Fictional prototype data.</p>
      </div>
    </section>
  );
}