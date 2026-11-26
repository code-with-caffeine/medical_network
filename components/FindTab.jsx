'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { SCORE, rank, parseSymptoms } from '../lib/data';
import { Chips, btn, btn2, lnk, inp, box, h1, h2 } from './ui';
import JourneyCard from './JourneyCard';

const SORTERS = {
  match: (a, b) => b.s - a.s,
  verified: (a, b) => (b.src === 'doctor') - (a.src === 'doctor') || b.s - a.s,
  improved: (a, b) => SCORE[b.out] - SCORE[a.out] || b.s - a.s,
  recent: (a, b) => b.ts - a.ts,
};

export default function FindTab() {
  const { cases, doctors, requests, hidden, picked, setPicked, searched, search, saved, setModalDoc, setProfileDoc, notify, go } = useApp();
  const [desc, setDesc] = useState('');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sort, setSort] = useState('match');
  const [cond, setCond] = useState('all');
  const inResults = !!searched;
  const symRef = useRef(null);
  const refine = (list) => search(list, false); // live updates do not count as new searches

  // On phones the symptom panel starts collapsed so the answer is the first thing you see.
  useEffect(() => {
    if (inResults && symRef.current && window.matchMedia('(max-width: 1023px)').matches) symRef.current.open = false;
  }, [inResults]);

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
    // Approaches seen in 2+ cases rank above one-off anecdotes, then by improvement rate.
    const treatments = Object.values(tx).map((t) => ({ ...t, rate: Math.round((t.sc / t.w) * 100) }))
      .sort((a, b) => (b.n >= 2) - (a.n >= 2) || b.rate - a.rate || b.n - a.n);
    const dm = {};
    m.filter((x) => x.src === 'doctor').forEach((x) => { const d = (dm[x.doc] ||= { id: x.doc, n: 0, best: 0 }); d.n++; d.best = Math.max(d.best, x.s); });
    const docs = Object.values(dm).sort((a, b) => b.best - a.best);
    const cs = {};
    m.forEach((x) => (cs[x.cond] = (cs[x.cond] || 0) + x.s));
    const top = Object.entries(cs).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { m: [...m].sort(SORTERS[sort]), conds, c, treatments, docs, top };
  }, [searched, cases, doctors, hidden, onlyVerified, sort, cond]);

  const savedCases = cases.filter((x) => saved.includes(x.id));

  // First search: words and chips together, one step.
  const submitHero = (e) => {
    e.preventDefault();
    const found = parseSymptoms(desc);
    const list = [...new Set([...picked, ...found])];
    if (!list.length) return notify(desc.trim() ? 'We could not match those words. Tap the symptoms that fit instead.' : 'Describe how you feel or tap a symptom.');
    search(list);
    setDesc('');
  };
  // Adding detail while looking at results updates them in place.
  const addDetail = (e) => {
    e.preventDefault();
    const add = parseSymptoms(desc).filter((s) => !picked.includes(s));
    if (!add.length) return notify('No new symptoms recognised. Tap one from the list.');
    refine([...picked, ...add]);
    setDesc('');
  };

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

  const best = res?.treatments.find((t) => t.n >= 2); // never crown a winner from a single case
  const first = res?.treatments[0];

  return (
    <div>
      {!inResults && (
        <section className="max-w-2xl pb-6 pt-4 md:pt-10">
          <h1 className={h1}>What are you feeling?</h1>
          <p className="mt-3 text-lg text-ink-soft">Describe it in your own words, or tap what fits. We will show how people with similar symptoms got better.</p>
          <form onSubmit={submitHero} className="mt-6">
            <input aria-label="Describe your symptoms in your own words" className={`${inp} !min-h-14 !text-lg`} placeholder="For example: exhausted, and my heart races when I stand up" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <p className="mb-2 mt-5 text-sm text-ink-soft">Or tap what fits</p>
            <Chips picked={picked} setPicked={setPicked} />
            <button className={`${btn} mt-6 !min-h-12 !px-7 !text-base`}>Find people like me</button>
          </form>
          <p className="mt-4 text-sm text-ink-soft">Peer experience only, never a prescription.</p>
          <button onClick={() => go('insights')} className={`${lnk} mt-1`}>Or see how outcomes compare across conditions</button>
        </section>
      )}

      {inResults && (
        <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <details ref={symRef} open className="group">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
                <h1 className={h2}>Your symptoms</h1>
                <span className="text-sm text-ink-soft lg:hidden">
                  <span className="group-open:hidden">{picked.length} selected, tap to edit</span>
                  <span className="hidden group-open:inline">tap to hide</span>
                </span>
              </summary>
              <p className="mb-3 mt-1 text-sm text-ink-soft">Tap to add or remove. Results update as you go.</p>
              <Chips picked={picked} setPicked={refine} />
              <form onSubmit={addDetail} className="mt-4 flex gap-2">
                <input aria-label="Add detail in your own words" className={inp} placeholder="Add detail, e.g. nausea" value={desc} onChange={(e) => setDesc(e.target.value)} />
                <button className={btn2} disabled={!desc.trim()}>Add</button>
              </form>
              <button onClick={() => { search([]); setDesc(''); }} className={`${lnk} mt-2`}>Start over</button>
            </details>
          </aside>

          <div className="reveal min-w-0 space-y-10">
            <details className="border-y border-rule text-sm">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between">
                <span className="font-medium">Refine results</span><span className="text-ink-soft">{res.m.length} matches</span>
              </summary>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-3">
                <label className="flex min-h-10 items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} /> Doctor-verified only</label>
                <label className="flex items-center gap-2">Diagnosis
                  <select aria-label="Filter by diagnosis" className="min-h-10 rounded border [border-color:var(--rule)] [background:var(--surface)] px-2" value={res.c} onChange={(e) => setCond(e.target.value)}>
                    <option value="all">All</option>{res.conds.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2">Sort
                  <select aria-label="Sort journeys" className="min-h-10 rounded border [border-color:var(--rule)] [background:var(--surface)] px-2" value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="match">Best match</option><option value="verified">Doctor-verified first</option><option value="improved">Most improved</option><option value="recent">Most recent</option>
                  </select>
                </label>
              </div>
            </details>

            {res.m.length === 0 ? (
              <section>
                <p className="font-serif text-2xl">No close matches yet.</p>
                <p className="mt-2 text-ink-soft">Try adding another symptom or loosening the filters. If you have been through this, sharing your journey helps the next person.</p>
                <button onClick={() => go('share')} className={`${btn2} mt-4`}>Share my journey</button>
              </section>
            ) : (<>
              <section>
                <p className="font-serif text-2xl leading-snug md:text-3xl">
                  {res.m.length} {res.m.length === 1 ? 'person' : 'people'} with similar symptoms, most often diagnosed with {res.top}.{' '}
                  {best
                    ? `${best.name} has the best reported results: ${best.rate}% improved across ${best.n} cases.`
                    : `There are not enough cases yet to say what works best. The one approach reported so far is ${first.name}.`}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5">
                  <button onClick={exportSummary} className={lnk}>Download summary for my doctor</button>
                  <button onClick={() => go('insights')} className={lnk}>Compare outcomes by condition</button>
                </div>
                <p className="mt-2 max-w-2xl text-sm text-ink-soft">Self-reported outcomes can be affected by placebo effect, other treatments and misdiagnosis. Talk to your doctor before changing anything.</p>
              </section>

              <section>
                <h2 className={h2}>What people tried</h2>
                <ul className="mt-3 divide-y divide-rule border-y border-rule">
                  {res.treatments.map((t) => (
                    <li key={t.name} className="py-3">
                      <div className="flex justify-between gap-3"><span className="font-medium">{t.name}</span><span className="shrink-0">{t.rate}% improved</span></div>
                      <div className="mt-2 h-1.5 rounded bg-rule"><div className="h-1.5 rounded bg-brand" style={{ width: `${t.rate}%` }} /></div>
                      <p className="mt-1.5 text-sm text-ink-soft">
                        {t.n} {t.n === 1 ? 'case' : 'cases'}, {t.ver} doctor-verified.
                        {t.n < 3 && <span className="ml-2 rounded-full border border-ink-soft px-2 py-0.5 text-xs">Small sample, read with caution</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className={h2}>Doctors who have handled similar cases</h2>
                {res.docs.length === 0 && <p className="mt-2 text-ink-soft">No verified doctors for this profile yet.</p>}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {res.docs.map((d) => {
                    const doc = doctors[d.id];
                    const sent = requests.find((r) => r.doc === d.id && r.status === 'pending');
                    return (
                      <div key={d.id} className={`${box} p-4`}>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-ink-soft">{doc.spec}, {doc.city}</p>
                        <p className="mt-2 text-sm">{d.n} similar {d.n === 1 ? 'case' : 'cases'}, closest match {Math.round(d.best * 100)}%</p>
                        <div className="mt-3 flex items-center gap-3">
                          <button onClick={() => setModalDoc(d.id)} disabled={!!sent || !doc.accepting} className={btn2}>{sent ? 'Request pending' : doc.accepting ? 'Request consultation' : 'Not accepting patients'}</button>
                          <button onClick={() => setProfileDoc(d.id)} className={lnk}>Profile</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2 className={h2}>Closest journeys</h2>
                <ul className="mt-3 divide-y divide-rule border-y border-rule">
                  {res.m.slice(0, 8).map((x) => <li key={x.id}><JourneyCard x={x} /></li>)}
                </ul>
                <div className="mt-8 border-l-4 border-brand pl-4">
                  <p className="font-medium">Been through something similar?</p>
                  <p className="text-sm text-ink-soft">Sharing your journey anonymously helps the next person find answers faster.</p>
                  <button onClick={() => go('share')} className={`${btn2} mt-2`}>Share my journey</button>
                </div>
              </section>
            </>)}
          </div>
        </div>
      )}

      {savedCases.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <h2 className={h2}>Saved ({savedCases.length})</h2>
          <ul className="mt-3 divide-y divide-rule border-y border-rule">{savedCases.map((x) => <li key={x.id}><JourneyCard x={x} /></li>)}</ul>
        </section>
      )}
    </div>
  );
}
