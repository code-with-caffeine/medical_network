'use client';
import { useState } from 'react';

const SYMPTOMS = ['fatigue', 'brain fog', 'palpitations', 'dizzy on standing', 'joint pain', 'widespread pain', 'poor sleep', 'headache', 'nausea', 'light sensitivity'];
const DOCS = {
  d1: { name: 'Dr. Meera Iyer', spec: 'Cardiology (autonomic disorders)', city: 'Bengaluru' },
  d2: { name: 'Dr. Arjun Sen', spec: 'Rheumatology', city: 'Kolkata' },
  d3: { name: 'Dr. Farah Khan', spec: 'Neurology (headache clinic)', city: 'Delhi' },
};
const c = (id, src, doc, cond, sym, tx, out) => ({ id, src, doc, cond, sym: sym.split(','), tx, out });
const SEED = [
  c(1, 'doctor', 'd1', 'POTS', 'palpitations,dizzy on standing,fatigue', 'Salt + fluids + compression wear', 'improved'),
  c(2, 'doctor', 'd1', 'POTS', 'palpitations,dizzy on standing,brain fog', 'Low-dose beta blocker', 'improved'),
  c(3, 'doctor', 'd1', 'POTS', 'dizzy on standing,fatigue,poor sleep', 'Salt + fluids + compression wear', 'partial'),
  c(4, 'patient', null, 'Long COVID', 'fatigue,brain fog,poor sleep', 'Paced activity + sleep routine', 'partial'),
  c(5, 'patient', null, 'Long COVID', 'fatigue,brain fog,palpitations', 'Paced activity + sleep routine', 'improved'),
  c(6, 'patient', null, 'Long COVID', 'fatigue,brain fog', 'High-dose vitamin supplements', 'none'),
  c(7, 'doctor', 'd2', 'Fibromyalgia', 'widespread pain,fatigue,poor sleep', 'Graded exercise + low-dose amitriptyline', 'improved'),
  c(8, 'doctor', 'd2', 'Fibromyalgia', 'widespread pain,joint pain,brain fog', 'Graded exercise + low-dose amitriptyline', 'partial'),
  c(9, 'patient', null, 'Fibromyalgia', 'widespread pain,fatigue', 'Painkillers only', 'none'),
  c(10, 'doctor', 'd3', 'Migraine', 'headache,nausea,light sensitivity', 'Triptan at onset + trigger diary', 'improved'),
  c(11, 'doctor', 'd3', 'Migraine', 'headache,light sensitivity,dizzy on standing', 'Preventive (propranolol)', 'improved'),
  c(12, 'patient', null, 'Migraine', 'headache,nausea', 'Triptan at onset + trigger diary', 'improved'),
];
const SCORE = { improved: 1, partial: 0.5, none: 0 };
const jac = (a, b) => a.filter((x) => b.includes(x)).length / (new Set([...a, ...b]).size || 1);

function Chips({ picked, setPicked }) {
  const toggle = (s) => setPicked(picked.includes(s) ? picked.filter((x) => x !== s) : [...picked, s]);
  return (
    <div className="flex flex-wrap gap-2">
      {SYMPTOMS.map((s) => (
        <button key={s} type="button" onClick={() => toggle(s)} aria-pressed={picked.includes(s)}
          className={`rounded-full border px-3 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${picked.includes(s) ? 'border-teal-800 bg-teal-800 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-teal-700'}`}>
          {s}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState('patient');
  const [cases, setCases] = useState(SEED);
  const [picked, setPicked] = useState([]);
  const [res, setRes] = useState(null);
  const [leads, setLeads] = useState({});
  const [f, setF] = useState({ doc: 'd1', cond: '', tx: '', out: 'improved', sym: [] });
  const [saved, setSaved] = useState(false);

  const find = () => {
    const m = cases.map((x) => ({ ...x, s: jac(picked, x.sym) })).filter((x) => x.s > 0.15).sort((a, b) => b.s - a.s);
    const tx = {};
    m.forEach((x) => {
      const t = (tx[x.tx] ||= { name: x.tx, w: 0, sc: 0, n: 0, ver: 0 });
      t.w += x.s; t.sc += x.s * SCORE[x.out]; t.n++; t.ver += x.src === 'doctor' ? 1 : 0;
    });
    const treatments = Object.values(tx).map((t) => ({ ...t, rate: Math.round((t.sc / t.w) * 100) })).sort((a, b) => b.rate - a.rate);
    const dm = {};
    m.filter((x) => x.src === 'doctor').forEach((x) => { (dm[x.doc] ||= { id: x.doc, n: 0, best: 0 }).n++; dm[x.doc].best = Math.max(dm[x.doc].best, x.s); });
    const docs = Object.values(dm).sort((a, b) => b.best - a.best);
    const conds = {};
    m.forEach((x) => (conds[x.cond] = (conds[x.cond] || 0) + x.s));
    const top = Object.entries(conds).sort((a, b) => b[1] - a[1])[0]?.[0];
    setLeads((l) => { const n = { ...l }; docs.forEach((d) => (n[d.id] = (n[d.id] || 0) + 1)); return n; });
    setRes({ m, treatments, docs, top });
  };

  const addCase = (e) => {
    e.preventDefault();
    if (!f.cond || !f.tx || !f.sym.length) return;
    setCases([...cases, { id: Date.now(), src: 'doctor', doc: f.doc, cond: f.cond, sym: f.sym, tx: f.tx, out: f.out }]);
    setF({ ...f, cond: '', tx: '', sym: [] });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Tab = ({ id, children }) => (
    <button onClick={() => setTab(id)} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === id ? 'border-teal-800 text-teal-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{children}</button>
  );
  const inp = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700';

  return (
    <main className="min-h-screen bg-[#F5F7F8] text-[#17303A]">
      <div className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="font-serif text-4xl leading-tight">Find people who have been where you are</h1>
        <p className="mt-2 max-w-xl text-slate-600">Compare your symptoms with anonymised patient journeys and doctor-verified cases. Peer experience only, never a prescription.</p>

        <nav className="mt-8 flex border-b border-slate-300">
          <Tab id="patient">For patients</Tab><Tab id="doctor">For doctors</Tab><Tab id="roadmap">Product ideas</Tab>
        </nav>

        {tab === 'patient' && (
          <section className="mt-6 space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="mb-3 font-medium">What are you experiencing?</h2>
              <Chips picked={picked} setPicked={setPicked} />
              <button onClick={find} disabled={!picked.length} className="mt-4 rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">Find similar journeys</button>
            </div>

            {res && res.m.length === 0 && <p className="text-slate-600">No close matches yet. Try adding or changing symptoms.</p>}
            {res && res.m.length > 0 && (<>
              <div className="rounded-lg border-l-4 border-teal-800 bg-white p-5">
                <p className="text-sm text-slate-500">Summary (template text now; swap in an LLM call here)</p>
                <p className="mt-1">{res.m.length} people with similar profiles, most often diagnosed with <b>{res.top}</b>. The approach with the best reported results was <b>{res.treatments[0].name}</b> ({res.treatments[0].rate}% weighted improvement, {res.treatments[0].n} {res.treatments[0].n === 1 ? 'case' : 'cases'}).</p>
              </div>

              <div>
                <h2 className="mb-2 font-medium">What people tried</h2>
                <div className="space-y-2">
                  {res.treatments.map((t) => (
                    <div key={t.name} className="rounded-lg border border-slate-200 bg-white p-4">
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
                  {res.docs.map((d) => (
                    <div key={d.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <p className="font-medium">{DOCS[d.id].name}</p>
                      <p className="text-sm text-slate-600">{DOCS[d.id].spec}, {DOCS[d.id].city}</p>
                      <p className="mt-2 text-sm">{d.n} similar {d.n === 1 ? 'case' : 'cases'} shared, {Math.round(d.best * 100)}% closest match</p>
                      <button className="mt-3 rounded-md border border-teal-800 px-3 py-1.5 text-sm text-teal-900 hover:bg-teal-50">Request consultation</button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="mb-2 font-medium">Closest journeys</h2>
                <div className="space-y-2">
                  {res.m.slice(0, 4).map((x) => (
                    <div key={x.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
                      <div>
                        <p className="font-medium">{x.cond}: {x.tx}</p>
                        <p className="text-slate-500">{x.sym.join(', ')}</p>
                        <p className="text-slate-500">{x.src === 'doctor' ? `Verified by ${DOCS[x.doc].name}` : 'Shared by an anonymous patient'}. Outcome: {x.out === 'none' ? 'no change' : x.out}</p>
                      </div>
                      <div className="w-24 shrink-0 text-right"><span className="text-lg font-serif">{Math.round(x.s * 100)}%</span><div className="mt-1 h-1.5 rounded bg-slate-100"><div className="h-1.5 rounded bg-teal-700" style={{ width: `${x.s * 100}%` }} /></div><span className="text-xs text-slate-500">similar</span></div>
                    </div>
                  ))}
                </div>
                <button className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm">Message a peer (opt-in members only)</button>
              </div>
            </>)}
          </section>
        )}

        {tab === 'doctor' && (
          <section className="mt-6 grid gap-6 md:grid-cols-2">
            <form onSubmit={addCase} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="font-medium">Share an anonymised case</h2>
              <select className={inp} value={f.doc} onChange={(e) => setF({ ...f, doc: e.target.value })}>{Object.entries(DOCS).map(([id, d]) => <option key={id} value={id}>{d.name}</option>)}</select>
              <input className={inp} placeholder="Diagnosis (e.g. POTS)" value={f.cond} onChange={(e) => setF({ ...f, cond: e.target.value })} />
              <Chips picked={f.sym} setPicked={(sym) => setF({ ...f, sym })} />
              <input className={inp} placeholder="Treatment given" value={f.tx} onChange={(e) => setF({ ...f, tx: e.target.value })} />
              <select className={inp} value={f.out} onChange={(e) => setF({ ...f, out: e.target.value })}><option value="improved">Improved</option><option value="partial">Partly improved</option><option value="none">No change</option></select>
              <label className="flex gap-2 text-xs text-slate-600"><input type="checkbox" defaultChecked /> I confirm the patient consented and no identifying details are included.</label>
              <button className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white">Publish case</button>
              {saved && <p role="status" className="text-sm text-teal-800">Case published. Patient searches now include it.</p>}
            </form>
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="font-medium">What you get</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  <li>Patients with matching profiles are pointed to you.</li>
                  <li>See how your outcomes compare with peers on the same condition.</li>
                  <li>Search similar cases while deciding on a plan (decision support).</li>
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="font-medium">Referral visibility this session</h2>
                {Object.entries(DOCS).map(([id, d]) => (
                  <div key={id} className="mt-2 flex justify-between text-sm"><span>{d.name}</span><span>{cases.filter((x) => x.doc === id).length} cases, {leads[id] || 0} patient searches</span></div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === 'roadmap' && (
          <section className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ['Start narrow', 'Launch with conditions where patient experience runs ahead of the literature, such as POTS, long COVID and fibromyalgia, then expand.'],
              ['Data quality labels', 'Doctor-verified and self-reported cases are separate. Small samples are flagged. Prototype: done.'],
              ['LLM-written summaries', 'Let people describe symptoms in their own words and get a plain-language summary. Prototype: template placeholder.'],
              ['Doctor decision support', 'Position the clinician tool as the main product to reduce liability and build trust.'],
              ['Consent and privacy', 'Explicit consent, de-identification, HIPAA/GDPR-style review and regional rules (India: DPDP Act) before real data.'],
              ['Retention', 'Recovered members become mentors, and chronic-condition tracking keeps the record useful over time.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg border border-slate-200 bg-white p-4"><p className="font-medium">{t}</p><p className="mt-1 text-sm text-slate-600">{d}</p></div>
            ))}
          </section>
        )}
        <p className="mt-10 text-xs text-slate-500">Prototype with fictional data. Similarity uses simple symptom overlap (Jaccard) as a stand-in for a trained model. Do not enter real patient information.</p>
      </div>
    </main>
  );
}