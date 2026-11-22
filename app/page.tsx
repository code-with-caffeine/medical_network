'use client';
import { useEffect, useMemo, useState } from 'react';

const KEY = 'medmatch-v1';
const SYMPTOMS = ['fatigue', 'brain fog', 'palpitations', 'dizzy on standing', 'joint pain', 'widespread pain', 'poor sleep', 'headache', 'nausea', 'light sensitivity'];
// Stand-in for an LLM: maps everyday words to the symptom list above.
const SYN = {
  tired: 'fatigue', exhausted: 'fatigue', fatigue: 'fatigue', drained: 'fatigue',
  fog: 'brain fog', concentrate: 'brain fog', forgetful: 'brain fog',
  racing: 'palpitations', palpitation: 'palpitations', heartbeat: 'palpitations',
  dizzy: 'dizzy on standing', lightheaded: 'dizzy on standing', faint: 'dizzy on standing',
  joint: 'joint pain', aches: 'widespread pain', 'all over': 'widespread pain', widespread: 'widespread pain',
  insomnia: 'poor sleep', 'cant sleep': 'poor sleep', "can't sleep": 'poor sleep', sleep: 'poor sleep',
  headache: 'headache', migraine: 'headache', nausea: 'nausea', nauseous: 'nausea', sick: 'nausea',
  light: 'light sensitivity', bright: 'light sensitivity',
};
const DOCS = {
  d1: { name: 'Dr. Meera Iyer', spec: 'Cardiology (autonomic disorders)', city: 'Bengaluru' },
  d2: { name: 'Dr. Arjun Sen', spec: 'Rheumatology', city: 'Kolkata' },
  d3: { name: 'Dr. Farah Khan', spec: 'Neurology (headache clinic)', city: 'Delhi' },
};
const c = (id, src, doc, cond, sym, tx, out, open = true) => ({ id, src, doc, cond, sym: sym.split(','), tx, out, open, alias: `Peer #${4000 + id * 37}` });
const SEED = [
  c(1, 'doctor', 'd1', 'POTS', 'palpitations,dizzy on standing,fatigue', 'Salt + fluids + compression wear', 'improved'),
  c(2, 'doctor', 'd1', 'POTS', 'palpitations,dizzy on standing,brain fog', 'Low-dose beta blocker', 'improved'),
  c(3, 'doctor', 'd1', 'POTS', 'dizzy on standing,fatigue,poor sleep', 'Salt + fluids + compression wear', 'partial'),
  c(4, 'patient', null, 'Long COVID', 'fatigue,brain fog,poor sleep', 'Paced activity + sleep routine', 'partial'),
  c(5, 'patient', null, 'Long COVID', 'fatigue,brain fog,palpitations', 'Paced activity + sleep routine', 'improved'),
  c(6, 'patient', null, 'Long COVID', 'fatigue,brain fog', 'High-dose vitamin supplements', 'none', false),
  c(7, 'doctor', 'd2', 'Fibromyalgia', 'widespread pain,fatigue,poor sleep', 'Graded exercise + low-dose amitriptyline', 'improved'),
  c(8, 'doctor', 'd2', 'Fibromyalgia', 'widespread pain,joint pain,brain fog', 'Graded exercise + low-dose amitriptyline', 'partial'),
  c(9, 'patient', null, 'Fibromyalgia', 'widespread pain,fatigue', 'Painkillers only', 'none'),
  c(10, 'doctor', 'd3', 'Migraine', 'headache,nausea,light sensitivity', 'Triptan at onset + trigger diary', 'improved'),
  c(11, 'doctor', 'd3', 'Migraine', 'headache,light sensitivity,dizzy on standing', 'Preventive (propranolol)', 'improved'),
  c(12, 'patient', null, 'Migraine', 'headache,nausea', 'Triptan at onset + trigger diary', 'improved'),
];
const SCORE = { improved: 1, partial: 0.5, none: 0 };
const OUT = { improved: 'improved', partial: 'partly improved', none: 'no change' };
const jac = (a, b) => a.filter((x) => b.includes(x)).length / (new Set([...a, ...b]).size || 1);
const rank = (sym, cases) => cases.filter((x) => !x.mine).map((x) => ({ ...x, s: jac(sym, x.sym) })).filter((x) => x.s > 0.15).sort((a, b) => b.s - a.s);
const who = (x) => (x.src === 'doctor' ? DOCS[x.doc].name : x.alias);
const time = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const inp = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700';
const btn = 'rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const btn2 = 'rounded-md border border-teal-800 px-3 py-1.5 text-sm text-teal-900 hover:bg-teal-50 disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700';

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

const Status = ({ s }) => {
  const m = { pending: 'bg-amber-100 text-amber-800', accepted: 'bg-teal-100 text-teal-900', declined: 'bg-slate-200 text-slate-700' };
  return <span className={`rounded px-2 py-0.5 text-xs ${m[s]}`}>{s}</span>;
};

export default function Home() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('patient');
  const [cases, setCases] = useState(SEED);
  const [requests, setRequests] = useState([]);
  const [threads, setThreads] = useState({});
  const [saved, setSaved] = useState([]);
  const [leads, setLeads] = useState({});
  const [picked, setPicked] = useState([]);
  const [searched, setSearched] = useState(null);
  const [desc, setDesc] = useState('');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [toast, setToast] = useState('');
  const [modalDoc, setModalDoc] = useState(null);
  const [reqForm, setReqForm] = useState({ msg: '', slot: 'This week' });
  const [activeThread, setActiveThread] = useState(null);
  const [draft, setDraft] = useState('');
  const [me, setMe] = useState('d1');
  const [docForm, setDocForm] = useState({ cond: '', tx: '', out: 'improved', sym: [], consent: false });
  const [myForm, setMyForm] = useState({ cond: '', tx: '', out: 'improved', sym: [], open: true, consent: false });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.cases) setCases(d.cases);
        if (d.requests) setRequests(d.requests);
        if (d.threads) setThreads(d.threads);
        if (d.saved) setSaved(d.saved);
        if (d.leads) setLeads(d.leads);
      }
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify({ cases, requests, threads, saved, leads })); } catch {}
  }, [ready, cases, requests, threads, saved, leads]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!modalDoc) return;
    const h = (e) => e.key === 'Escape' && setModalDoc(null);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [modalDoc]);

  const res = useMemo(() => {
    if (!searched) return null;
    let m = rank(searched, cases);
    if (onlyVerified) m = m.filter((x) => x.src === 'doctor');
    const tx = {};
    m.forEach((x) => {
      const t = (tx[x.tx] ||= { name: x.tx, w: 0, sc: 0, n: 0, ver: 0 });
      t.w += x.s; t.sc += x.s * SCORE[x.out]; t.n++; t.ver += x.src === 'doctor' ? 1 : 0;
    });
    const treatments = Object.values(tx).map((t) => ({ ...t, rate: Math.round((t.sc / t.w) * 100) })).sort((a, b) => b.rate - a.rate);
    const dm = {};
    m.filter((x) => x.src === 'doctor').forEach((x) => { const d = (dm[x.doc] ||= { id: x.doc, n: 0, best: 0 }); d.n++; d.best = Math.max(d.best, x.s); });
    const docs = Object.values(dm).sort((a, b) => b.best - a.best);
    const conds = {};
    m.forEach((x) => (conds[x.cond] = (conds[x.cond] || 0) + x.s));
    const top = Object.entries(conds).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { m, treatments, docs, top };
  }, [searched, cases, onlyVerified]);

  const notify = (m) => setToast(m);

  const runSearch = () => {
    if (!picked.length) return;
    setSearched(picked);
    const ids = new Set(rank(picked, cases).filter((x) => x.src === 'doctor').map((x) => x.doc));
    setLeads((l) => { const n = { ...l }; ids.forEach((id) => (n[id] = (n[id] || 0) + 1)); return n; });
  };

  const parseDesc = () => {
    const t = desc.toLowerCase();
    const found = new Set(picked);
    Object.entries(SYN).forEach(([k, v]) => t.includes(k) && found.add(v));
    SYMPTOMS.forEach((s) => t.includes(s) && found.add(s));
    const next = [...found];
    if (next.length === picked.length) return notify('No new symptoms recognised. Try different words or pick from the list.');
    setPicked(next);
    notify(`Added ${next.length - picked.length} symptom(s) from your description`);
  };

  const toggleSave = (id) => {
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const sendRequest = (e) => {
    e.preventDefault();
    setRequests((r) => [{ id: Date.now(), doc: modalDoc, msg: reqForm.msg.trim(), slot: reqForm.slot, symptoms: searched || [], status: 'pending', ts: Date.now() }, ...r]);
    notify(`Request sent to ${DOCS[modalDoc].name}`);
    setModalDoc(null);
    setReqForm({ msg: '', slot: 'This week' });
  };
  const decide = (id, status) => {
    setRequests((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    notify(status === 'accepted' ? 'Request accepted. The patient sees it under Messages.' : 'Request declined');
  };

  const openThread = (id) => {
    setThreads((t) => (t[id] ? t : { ...t, [id]: [] }));
    setActiveThread(id);
    setTab('messages');
  };
  const sendMsg = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || activeThread == null) return;
    const id = activeThread;
    const k = cases.find((x) => x.id === id);
    setThreads((t) => ({ ...t, [id]: [...(t[id] || []), { from: 'me', text, ts: Date.now() }] }));
    setDraft('');
    const n = (threads[id] || []).filter((m) => m.from === 'me').length;
    const replies = [
      `Hi, glad you reached out. ${k.tx.toLowerCase()} ${k.out === 'improved' ? 'made a real difference' : k.out === 'partial' ? 'helped a little' : 'did not do much'} for me.`,
      'It took a few weeks to notice anything. Keeping a daily symptom log helped me and my doctor.',
      'Please check with your own doctor before trying anything. Everyone responds differently.',
    ];
    setTimeout(() => {
      setThreads((t) => ({ ...t, [id]: [...(t[id] || []), { from: 'peer', text: replies[Math.min(n, replies.length - 1)], ts: Date.now() }] }));
    }, 1200);
  };

  const addDocCase = (e) => {
    e.preventDefault();
    if (!docForm.cond || !docForm.tx || !docForm.sym.length || !docForm.consent) return;
    setCases((cs) => [...cs, { id: Date.now(), src: 'doctor', doc: me, cond: docForm.cond.trim(), sym: docForm.sym, tx: docForm.tx.trim(), out: docForm.out, open: false, alias: '' }]);
    setDocForm({ cond: '', tx: '', out: 'improved', sym: [], consent: false });
    notify('Case published. Patient searches now include it.');
  };
  const addMyCase = (e) => {
    e.preventDefault();
    if (!myForm.cond || !myForm.tx || !myForm.sym.length || !myForm.consent) return;
    setCases((cs) => [...cs, { id: Date.now(), src: 'patient', mine: true, doc: null, cond: myForm.cond.trim(), sym: myForm.sym, tx: myForm.tx.trim(), out: myForm.out, open: myForm.open, alias: 'You' }]);
    setMyForm({ cond: '', tx: '', out: 'improved', sym: [], open: true, consent: false });
    notify('Journey shared anonymously. Thank you.');
  };
  const removeCase = (id) => {
    setCases((cs) => cs.filter((x) => x.id !== id));
    setSaved((s) => s.filter((x) => x !== id));
    notify('Removed');
  };

  const resetDemo = () => {
    if (!confirm('Reset all demo data in this browser?')) return;
    try { localStorage.removeItem(KEY); } catch {}
    setCases(SEED); setRequests([]); setThreads({}); setSaved([]); setLeads({}); setSearched(null); setPicked([]); setActiveThread(null);
    notify('Demo data reset');
  };

  const myRequests = requests;
  const incoming = requests.filter((r) => r.doc === me);
  const docCases = cases.filter((x) => x.doc === me);
  const myCases = cases.filter((x) => x.mine);
  const savedCases = cases.filter((x) => saved.includes(x.id));
  const pendingN = incoming.filter((r) => r.status === 'pending').length;
  const activeCase = cases.find((x) => x.id === activeThread);
  const tabs = [['patient', 'Find journeys'], ['messages', 'Messages'], ['share', 'Share my journey'], ['doctor', pendingN ? `For doctors (${pendingN})` : 'For doctors'], ['ideas', 'Product ideas']];

  const JourneyCard = ({ x, withScore }) => (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{x.cond}: {x.tx}</p>
          <p className="text-slate-500">{x.sym.join(', ')}</p>
          <p className="text-slate-500">{x.src === 'doctor' ? `Verified by ${DOCS[x.doc].name}` : 'Shared by an anonymous patient'}. Outcome: {OUT[x.out]}</p>
        </div>
        {withScore && (
          <div className="w-24 shrink-0 text-right">
            <span className="font-serif text-lg">{Math.round(x.s * 100)}%</span>
            <div className="mt-1 h-1.5 rounded bg-slate-100"><div className="h-1.5 rounded bg-teal-700" style={{ width: `${x.s * 100}%` }} /></div>
            <span className="text-xs text-slate-500">similar</span>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => toggleSave(x.id)} aria-pressed={saved.includes(x.id)} className={btn2}>{saved.includes(x.id) ? 'Saved' : 'Save'}</button>
        {x.src === 'patient' && (x.open
          ? <button onClick={() => openThread(x.id)} className={btn2}>Message this peer</button>
          : <span className="self-center text-xs text-slate-500">This member is not open to messages</span>)}
        {x.src === 'doctor' && <button onClick={() => setModalDoc(x.doc)} className={btn2}>Ask {DOCS[x.doc].name.split(' ')[0]} {DOCS[x.doc].name.split(' ')[1]} for a consultation</button>}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F5F7F8] text-[#17303A]">
      <div className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="font-serif text-4xl leading-tight">Find people who have been where you are</h1>
        <p className="mt-2 max-w-xl text-slate-600">Compare your symptoms with anonymised patient journeys and doctor-verified cases. Peer experience only, never a prescription.</p>

        <nav className="mt-8 flex flex-wrap border-b border-slate-300" aria-label="Sections">
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
              className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === id ? 'border-teal-800 text-teal-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>
          ))}
        </nav>

        {tab === 'patient' && (
          <section className="mt-6 space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="mb-3 font-medium">What are you experiencing?</h2>
              <div className="mb-3 flex gap-2">
                <input aria-label="Describe symptoms in your own words" className={inp} placeholder="Or describe it: I feel exhausted and my heart is racing when I stand up" value={desc}
                  onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), parseDesc())} />
                <button onClick={parseDesc} disabled={!desc.trim()} className={btn2}>Add</button>
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
              <div className="flex items-center justify-between rounded-lg bg-white px-4 py-2 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} /> Doctor-verified cases only</label>
                <span className="text-slate-500">{res.m.length} matches</span>
              </div>
            )}
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
                  {res.docs.map((d) => {
                    const sent = requests.find((r) => r.doc === d.id && r.status === 'pending');
                    return (
                      <div key={d.id} className="rounded-lg border border-slate-200 bg-white p-4">
                        <p className="font-medium">{DOCS[d.id].name}</p>
                        <p className="text-sm text-slate-600">{DOCS[d.id].spec}, {DOCS[d.id].city}</p>
                        <p className="mt-2 text-sm">{d.n} similar {d.n === 1 ? 'case' : 'cases'} shared, {Math.round(d.best * 100)}% closest match</p>
                        <button onClick={() => setModalDoc(d.id)} disabled={!!sent} className={`mt-3 ${btn2}`}>{sent ? 'Request pending' : 'Request consultation'}</button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="mb-2 font-medium">Closest journeys</h2>
                <div className="space-y-2">{res.m.slice(0, 6).map((x) => <JourneyCard key={x.id} x={x} withScore />)}</div>
              </div>
            </>)}
          </section>
        )}

        {tab === 'messages' && (
          <section className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <h2 className="mb-2 px-1 text-sm font-medium">Peer conversations</h2>
                {Object.keys(threads).length === 0 && <p className="px-1 text-sm text-slate-600">None yet. Find a journey and choose Message this peer.</p>}
                {Object.keys(threads).map((id) => {
                  const k = cases.find((x) => String(x.id) === id);
                  if (!k) return null;
                  return (
                    <button key={id} onClick={() => setActiveThread(k.id)} className={`block w-full rounded px-2 py-2 text-left text-sm ${activeThread === k.id ? 'bg-teal-50 text-teal-900' : 'hover:bg-slate-50'}`}>
                      <span className="font-medium">{k.alias}</span><br /><span className="text-xs text-slate-500">{k.cond}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex min-h-[18rem] flex-col rounded-lg border border-slate-200 bg-white p-4 md:col-span-2">
                {!activeCase ? <p className="m-auto text-sm text-slate-500">Select a conversation</p> : (<>
                  <p className="border-b border-slate-100 pb-2 text-sm"><b>{activeCase.alias}</b>, {activeCase.cond}. Replies here are simulated in this prototype.</p>
                  <div className="flex-1 space-y-2 overflow-y-auto py-3" aria-live="polite">
                    {(threads[activeCase.id] || []).length === 0 && <p className="text-sm text-slate-500">Say hello. Do not share names, phone numbers or other identifying details.</p>}
                    {(threads[activeCase.id] || []).map((m, i) => (
                      <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : ''}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.from === 'me' ? 'bg-teal-800 text-white' : 'bg-slate-100'}`}>
                          {m.text}<span className="ml-2 text-[10px] opacity-60">{time(m.ts)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={sendMsg} className="flex gap-2">
                    <input aria-label="Message" className={inp} placeholder="Write a message" value={draft} onChange={(e) => setDraft(e.target.value)} />
                    <button className={btn} disabled={!draft.trim()}>Send</button>
                  </form>
                </>)}
              </div>
            </div>

            <div>
              <h2 className="mb-2 font-medium">Consultation requests</h2>
              {myRequests.length === 0 && <p className="text-sm text-slate-600">No requests yet. Search for journeys, then choose Request consultation on a doctor.</p>}
              <div className="space-y-2">
                {myRequests.map((r) => (
                  <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                    <div className="flex items-center justify-between"><span className="font-medium">{DOCS[r.doc].name}</span><Status s={r.status} /></div>
                    <p className="text-slate-600">Preferred time: {r.slot}. Symptoms shared: {r.symptoms.join(', ') || 'none'}.</p>
                    {r.msg && <p className="mt-1">“{r.msg}”</p>}
                    {r.status === 'accepted' && <p className="mt-1 text-teal-900">Accepted. The clinic will contact you for a {r.slot.toLowerCase()} slot.</p>}
                    {r.status === 'pending' && <button onClick={() => setRequests((rs) => rs.filter((x) => x.id !== r.id))} className="mt-2 text-xs text-slate-600 underline">Cancel request</button>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === 'share' && (
          <section className="mt-6 grid gap-6 md:grid-cols-2">
            <form onSubmit={addMyCase} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="font-medium">Share your journey anonymously</h2>
              <input aria-label="Diagnosis" className={inp} placeholder="Diagnosis (e.g. POTS)" value={myForm.cond} onChange={(e) => setMyForm({ ...myForm, cond: e.target.value })} />
              <Chips picked={myForm.sym} setPicked={(sym) => setMyForm({ ...myForm, sym })} />
              <input aria-label="What helped" className={inp} placeholder="What you tried" value={myForm.tx} onChange={(e) => setMyForm({ ...myForm, tx: e.target.value })} />
              <select aria-label="Outcome" className={inp} value={myForm.out} onChange={(e) => setMyForm({ ...myForm, out: e.target.value })}><option value="improved">Improved</option><option value="partial">Partly improved</option><option value="none">No change</option></select>
              <label className="flex gap-2 text-xs text-slate-600"><input type="checkbox" checked={myForm.open} onChange={(e) => setMyForm({ ...myForm, open: e.target.checked })} /> Let people with similar symptoms message me</label>
              <label className="flex gap-2 text-xs text-slate-600"><input type="checkbox" checked={myForm.consent} onChange={(e) => setMyForm({ ...myForm, consent: e.target.checked })} /> I agree to share this without my name or other identifying details.</label>
              <button className={btn} disabled={!myForm.cond || !myForm.tx || !myForm.sym.length || !myForm.consent}>Share journey</button>
            </form>
            <div>
              <h2 className="mb-2 font-medium">Your shared journeys</h2>
              {myCases.length === 0 && <p className="text-sm text-slate-600">Nothing shared yet. Your journeys help others with the same symptoms.</p>}
              <div className="space-y-2">
                {myCases.map((x) => (
                  <div key={x.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                    <p className="font-medium">{x.cond}: {x.tx}</p>
                    <p className="text-slate-500">{x.sym.join(', ')}. Outcome: {OUT[x.out]}. Messages {x.open ? 'on' : 'off'}.</p>
                    <button onClick={() => removeCase(x.id)} className="mt-2 text-xs text-slate-600 underline">Delete</button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">Your own journeys are hidden from your own search results.</p>
            </div>
          </section>
        )}

        {tab === 'doctor' && (
          <section className="mt-6 space-y-6">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <label htmlFor="me">Preview as</label>
              <select id="me" className={`${inp} max-w-xs`} value={me} onChange={(e) => setMe(e.target.value)}>{Object.entries(DOCS).map(([id, d]) => <option key={id} value={id}>{d.name}</option>)}</select>
              <span className="text-slate-500">{DOCS[me].spec}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              {[['Cases published', docCases.length], ['Patient searches that matched you', leads[me] || 0], ['Consultation requests', incoming.length]].map(([l, v]) => (
                <div key={l} className="rounded-lg border border-slate-200 bg-white p-4"><p className="font-serif text-3xl">{v}</p><p className="text-slate-600">{l}</p></div>
              ))}
            </div>

            <div>
              <h2 className="mb-2 font-medium">Incoming requests</h2>
              {incoming.length === 0 && <p className="text-sm text-slate-600">None yet. Switch to Find journeys, search, and request a consultation with this doctor.</p>}
              <div className="space-y-2">
                {incoming.map((r) => (
                  <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                    <div className="flex items-center justify-between"><span className="font-medium">Anonymous patient, wants {r.slot.toLowerCase()}</span><Status s={r.status} /></div>
                    <p className="text-slate-600">Symptoms: {r.symptoms.join(', ') || 'none shared'}</p>
                    {r.msg && <p className="mt-1">“{r.msg}”</p>}
                    {r.status === 'pending' && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => decide(r.id, 'accepted')} className={btn}>Accept</button>
                        <button onClick={() => decide(r.id, 'declined')} className={btn2}>Decline</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <form onSubmit={addDocCase} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="font-medium">Share an anonymised case</h2>
                <input aria-label="Diagnosis" className={inp} placeholder="Diagnosis (e.g. POTS)" value={docForm.cond} onChange={(e) => setDocForm({ ...docForm, cond: e.target.value })} />
                <Chips picked={docForm.sym} setPicked={(sym) => setDocForm({ ...docForm, sym })} />
                <input aria-label="Treatment given" className={inp} placeholder="Treatment given" value={docForm.tx} onChange={(e) => setDocForm({ ...docForm, tx: e.target.value })} />
                <select aria-label="Outcome" className={inp} value={docForm.out} onChange={(e) => setDocForm({ ...docForm, out: e.target.value })}><option value="improved">Improved</option><option value="partial">Partly improved</option><option value="none">No change</option></select>
                <label className="flex gap-2 text-xs text-slate-600"><input type="checkbox" checked={docForm.consent} onChange={(e) => setDocForm({ ...docForm, consent: e.target.checked })} /> The patient consented and no identifying details are included.</label>
                <button className={btn} disabled={!docForm.cond || !docForm.tx || !docForm.sym.length || !docForm.consent}>Publish case</button>
              </form>
              <div>
                <h2 className="mb-2 font-medium">Your published cases</h2>
                {docCases.length === 0 && <p className="text-sm text-slate-600">No cases yet.</p>}
                <div className="space-y-2">
                  {docCases.map((x) => (
                    <div key={x.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                      <p className="font-medium">{x.cond}: {x.tx}</p>
                      <p className="text-slate-500">{x.sym.join(', ')}. {OUT[x.out]}.</p>
                      <button onClick={() => removeCase(x.id)} className="mt-1 text-xs text-slate-600 underline">Unpublish</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === 'ideas' && (
          <section className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ['Start narrow', 'Launch with conditions where patient experience runs ahead of the literature, such as POTS, long COVID and fibromyalgia, then expand.'],
              ['Data quality labels', 'Doctor-verified and self-reported cases are separate, and small samples are flagged. Prototype: done.'],
              ['LLM-written summaries', 'Let people describe symptoms in their own words and get a plain-language summary. Prototype: keyword matching and template text.'],
              ['Doctor decision support', 'Position the clinician tool as the main product to reduce liability and build trust.'],
              ['Consent and privacy', 'Explicit consent, de-identification, HIPAA/GDPR-style review and regional rules (India: DPDP Act) before real data.'],
              ['Retention', 'Recovered members become mentors, and chronic-condition tracking keeps the record useful over time.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg border border-slate-200 bg-white p-4"><p className="font-medium">{t}</p><p className="mt-1 text-sm text-slate-600">{d}</p></div>
            ))}
          </section>
        )}

        <p className="mt-10 text-xs text-slate-500">
          Prototype with fictional data, saved only in this browser. Similarity uses simple symptom overlap (Jaccard) as a stand-in for a trained model. Do not enter real patient information.{' '}
          <button onClick={resetDemo} className="underline">Reset demo data</button>
        </p>
      </div>

      {modalDoc && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalDoc(null)}>
          <form role="dialog" aria-modal="true" aria-label="Request consultation" onSubmit={sendRequest} onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-3 rounded-lg bg-white p-5">
            <h2 className="font-medium">Request a consultation with {DOCS[modalDoc].name}</h2>
            <p className="text-sm text-slate-600">{searched?.length ? `Your symptoms will be shared: ${searched.join(', ')}.` : 'No symptoms selected. Search first to share them.'} Your name is not shared.</p>
            <textarea autoFocus aria-label="Message" rows={3} className={inp} placeholder="Anything the doctor should know (optional)" value={reqForm.msg} onChange={(e) => setReqForm({ ...reqForm, msg: e.target.value })} />
            <select aria-label="Preferred time" className={inp} value={reqForm.slot} onChange={(e) => setReqForm({ ...reqForm, slot: e.target.value })}><option>This week</option><option>Next week</option><option>Anytime</option></select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalDoc(null)} className={btn2}>Cancel</button>
              <button className={btn}>Send request</button>
            </div>
          </form>
        </div>
      )}

      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-md bg-[#17303A] px-4 py-2 text-sm text-white shadow">{toast}</div>}
    </main>
  );
}