'use client';
import { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { SCORE, OUT, rank } from '../lib/data';
import { Chips, btn, btn2, inp, box } from '../ui';
import JourneyCard from './JourneyCard';

const SORTERS = {
  match: (a, b) => b.s - a.s,
  verified: (a, b) => (b.src === 'doctor') - (a.src === 'doctor') || b.s - a.s,
  improved: (a, b) => SCORE[b.out] - SCORE[a.out] || b.s - a.s,
  recent: (a, b) => b.ts - a.ts,
};

export default function FindTab() {
  const { cases, doctors, requests, hidden, picked, setPicked, searched, setSearched, runSearch, parseDesc, saved, setModalDoc, setProfileDoc, notify } = useApp();
  const [desc, setDesc] = useState('');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sort, setSort] = useState('match');
  const [cond, setCond] = useState('all');

  const res = useMemo(() => {
    if (!searched) return null;
    const all = rank(searched, cases, doctors, hidden);
    const conds = [...new Set(all.map((x) => x.cond))];
    const c = conds.includes(cond) ? cond : 'all';
    let m = all;
    if (onlyVerified) m = m.filter((x) => x.src === 'doctor');
    if (c !== 'all') m = m.filter((x) => x.cond === c);
    const tx = {};
    m.forEach((x) => {
      const t = (tx[x.tx] ||= { name: x.tx, w: 0, sc: 0, n: 0, ver: 0 });
      t.w += x.s; t.sc += x.s * SCORE[x.out]; t.n++; t.ver += x.src === 'doctor' ? 1 : 0;
    });
    const treatments = Object.values(tx).map((t) => ({ ...t, rate: Math.round((t.sc / t.w) * 100) })).sort((a, b) => b.rate - a.rate);
    const dm = {};
    m.filter((x) => x.src === 'doctor').forEach((x) => { const d = (dm[x.doc] ||= { id: x.doc, n: 0, best: 0 }); d.n++; d.best = Math.max(d.best, x.s); });
    const docs = Object.values(dm).sort((a, b) => b.best - a.best);
    const cs = {};
    m.forEach((x) => (cs[x.cond] = (cs[x.cond] || 0) + x.s));
    const top = Object.entries(cs).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { m: [...m].sort(SORTERS[sort]), conds, c, treatments, docs, top };
  }, [searched, cases, doctors, hidden, onlyVerified, sort, cond]);

  const savedCases = cases.filter((x) => saved.includes(x.id));

  const exportSummary = () => {
    const lines = [
      'MedMatch summary (prototype, fictional data)',
      `Symptoms searched: ${searched.join(', ')}`,
      `Most common diagnosis among similar journeys: ${res.top}`,
      '', 'What similar people tried (reported improvement):',
      ...res.treatments.map((t) => `- ${t.name}: ${t.rate}% (${t.n} case${t.n === 1 ? '' : 's'}, ${t.ver} doctor-verified)`),
      '', 'Doctors with similar cases:',
      ...res.docs.map((d) => `- ${doctors[d.id].name}, ${doctors[d.id].spec}, ${doctors[d.id].city} (${d.n} similar case${d.n === 1 ? '' : 's'})`),
      '', 'Peer experience only, not medical advice. Discuss any change with your doctor.',
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'medmatch-summary.txt'; a.click();
    URL.revokeObjectURL(url);
    notify('Summary downloaded. Bring it to your appointment.');
  };

  return (
    <section className="mt-6 space-y-6">
      <div className={`${box} p-5`}>
        <h2 className="mb-3 font-medium">What are you experiencing?</h2>
        <div className="mb-3 flex gap-2">
          <input aria-label="Describe symptoms in your own words" className={inp} placeholder="Or describe it: I feel exhausted and my heart is racing when I stand up" value={desc}
            onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), parseDesc(desc))} />
          <button onClick={() => parseDesc(desc)} disabled={!desc.trim()} className={btn2}>Add</button>
        </div>
        <Chips picked={picked} setPicked={setPicked} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={runSearch} disabled={!picked.length} className={btn}>Find similar journeys</button>
          {picked.length > 0 && <button onClick={() => { setPicked([]); setSearched(null); }} className="text-sm text-slate-600 underline">Clear</button>}
        </div>
      </div>

      {savedCases.length > 0 && (
        <div>
          <h2 className="mb-2 font-medium">Saved ({savedCases.length})</h2>
          <div className="space-y-2">{savedCases.map((x) => <JourneyCard key={x.id} x={x} />)}</div>
        </div>
      )}

      {res && (
        <div className={`${box} flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 text-sm`}>
          <label className="flex items-center gap-2"><input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} /> Doctor-verified only</label>
          <label className="flex items-center gap-2">Diagnosis
            <select aria-label="Filter by diagnosis" className="rounded border border-slate-300 px-2 py-1" value={res.c} onChange={(e) => setCond(e.target.value)}>
              <option value="all">All</option>{res.conds.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">Sort
            <select aria-label="Sort journeys" className="rounded border border-slate-300 px-2 py-1" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="match">Best match</option><option value="verified">Doctor-verified first</option><option value="improved">Most improved</option><option value="recent">Most recent</option>
            </select>
          </label>
          <span className="ml-auto text-slate-500">{res.m.length} matches</span>
        </div>
      )}
      {res && res.m.length === 0 && <p className="text-slate-600">No close matches. Try adding symptoms or loosening the filters.</p>}
      {res && res.m.length > 0 && (<>
        <div className="rounded-lg border-l-4 border-teal-800 bg-white p-5">
          <p className="text-sm text-slate-500">Summary (template text now; swap in an LLM call here)</p>
          <p className="mt-1">{res.m.length} people with similar profiles, most often diagnosed with <b>{res.top}</b>. The approach with the best reported results was <b>{res.treatments[0].name}</b> ({res.treatments[0].rate}% weighted improvement, {res.treatments[0].n} {res.treatments[0].n === 1 ? 'case' : 'cases'}).</p>
          <button onClick={exportSummary} className={`mt-3 ${btn2}`}>Download summary for my doctor</button>
        </div>

        <div>
          <h2 className="mb-2 font-medium">What people tried</h2>
          <div className="space-y-2">
            {res.treatments.map((t) => (
              <div key={t.name} className={`${box} p-4`}>
                <div className="flex justify-between gap-3 text-sm"><span className="font-medium">{t.name}</span><span>{t.rate}% improved</span></div>
                <div className="mt-2 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-teal-700" style={{ width: `${t.rate}%` }} /></div>
                <p className="mt-2 text-xs text-slate-500">
                  {t.n} {t.n === 1 ? 'case' : 'cases'}, {t.ver} doctor-verified.
                  {t.n < 3 && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">Small sample, read with caution</span>}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Self-reported outcomes can be affected by placebo effect, other treatments and misdiagnosis. Talk to your doctor before changing anything.</p>
        </div>

        <div>
          <h2 className="mb-2 font-medium">Doctors who have handled similar cases</h2>
          {res.docs.length === 0 && <p className="text-sm text-slate-600">No verified doctors for this profile yet.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {res.docs.map((d) => {
              const doc = doctors[d.id];
              const sent = requests.find((r) => r.doc === d.id && r.status === 'pending');
              return (
                <div key={d.id} className={`${box} p-4`}>
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-sm text-slate-600">{doc.spec}, {doc.city}</p>
                  <p className="mt-2 text-sm">{d.n} similar {d.n === 1 ? 'case' : 'cases'} shared, {Math.round(d.best * 100)}% closest match</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setModalDoc(d.id)} disabled={!!sent || !doc.accepting} className={btn2}>{sent ? 'Request pending' : doc.accepting ? 'Request consultation' : 'Not accepting patients'}</button>
                    <button onClick={() => setProfileDoc(d.id)} className="text-sm underline">Profile</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-2 font-medium">Closest journeys</h2>
          <div className="space-y-2">{res.m.slice(0, 8).map((x) => <JourneyCard key={x.id} x={x} withScore />)}</div>
        </div>
      </>)}
    </section>
  );
}