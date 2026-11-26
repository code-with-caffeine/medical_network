'use client';
import { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { visibleCases, rate } from '../lib/data';
import { h1, h2, Bar, BackLink } from './ui';

function Stacked({ list }) {
  const n = list.length || 1;
  const k = { improved: list.filter((x) => x.out === 'improved').length, partial: list.filter((x) => x.out === 'partial').length, none: list.filter((x) => x.out === 'none').length };
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded bg-rule" role="img" aria-label={`${k.improved} improved, ${k.partial} partly improved, ${k.none} no change`}>
        <div className="bg-brand" style={{ width: `${(k.improved / n) * 100}%` }} />
        <div className="bg-brand/40" style={{ width: `${(k.partial / n) * 100}%` }} />
      </div>
      <p className="mt-1 text-xs text-ink-soft">Improved {k.improved}, partly {k.partial}, no change {k.none}</p>
    </div>
  );
}

export default function InsightsTab() {
  const { cases, doctors, hidden, searched } = useApp();
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
    pool.forEach((x) => { (tx[x.tx] ||= { name: x.tx, list: [] }).list.push(x); });
    const treatments = Object.values(tx).map((t) => ({ ...t, n: t.list.length, rate: rate(t.list) })).sort((a, b) => b.rate - a.rate || b.n - a.n);
    const sc = {};
    vis.forEach((x) => x.sym.forEach((s) => (sc[s] = (sc[s] || 0) + 1)));
    return { vis, groups, treatments, symptoms: Object.entries(sc).sort((a, b) => b[1] - a[1]) };
  }, [cases, doctors, hidden, cond]);

  const maxSym = d.symptoms[0]?.[1] || 1;
  const nDoc = d.vis.filter((x) => x.src === 'doctor').length;

  return (
    <div className="space-y-12">
      <header>
        <BackLink to="find">{searched ? 'Back to results' : 'Back to Find'}</BackLink>
        <h1 className={h1}>How outcomes compare</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">{d.vis.length} journeys across {d.groups.length} conditions, {nDoc} of them doctor-verified. Weighted improvement counts full improvement as 1, partial as 0.5 and no change as 0. Fictional prototype data.</p>
      </header>

      <section>
        <h2 className={h2}>Outcomes by condition</h2>
        <div className="mt-3 grid gap-x-8 md:grid-cols-2">
          {d.groups.map((g) => {
            const gap = g.dr.n && g.pt.n ? g.pt.rate - g.dr.rate : 0;
            return (
              <div key={g.name} className="border-t border-rule py-4">
                <div className="flex justify-between"><span className="font-medium">{g.name}</span><span>{g.rate}% improved</span></div>
                <div className="mt-2"><Stacked list={g.list} /></div>
                <p className="mt-2 text-sm text-ink-soft">Doctor-verified: {g.dr.n ? `${g.dr.rate}% (${g.dr.n})` : 'none'}. Self-reported: {g.pt.n ? `${g.pt.rate}% (${g.pt.n})` : 'none'}.</p>
                {Math.abs(gap) >= 20 && <p className="mt-1 rounded border border-ink-soft px-2 py-1 text-sm">Sources disagree by {Math.abs(gap)} points. Self-reported results are {gap > 0 ? 'rosier' : 'gloomier'} than doctor-verified ones here.</p>}
                {g.n < 5 && <p className="mt-1 text-sm text-ink-soft">Only {g.n} journeys so far.</p>}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={h2}>Treatment leaderboard</h2>
          <select aria-label="Condition" className="min-h-10 rounded border border-rule bg-white px-2 text-sm" value={cond} onChange={(e) => setCond(e.target.value)}>
            <option value="all">All conditions</option>{d.groups.map((g) => <option key={g.name}>{g.name}</option>)}
          </select>
        </div>
        <ul className="mt-3 divide-y divide-rule border-y border-rule">
          {d.treatments.map((t) => (
            <li key={t.name} className="py-3">
              <div className="flex justify-between gap-3"><span>{t.name}</span><span className="shrink-0">{t.rate}%, n={t.n}{t.n < 3 && <span className="ml-2 text-sm text-ink-soft">(small sample)</span>}</span></div>
              <div className="mt-1.5"><Bar pct={t.rate} /></div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className={h2}>Most reported symptoms</h2>
        <ul className="mt-3 space-y-2">
          {d.symptoms.map(([s, n]) => (
            <li key={s} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 text-sm"><span>{s}</span><Bar pct={(n / maxSym) * 100} /><span className="text-right text-ink-soft">{n}</span></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
