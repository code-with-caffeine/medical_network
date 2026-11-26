'use client';
// Doctor workspace. Three views driven by the route: d/requests, d/cases, d/profile.
import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '../lib/store';
import { OUT } from '../lib/data';
import { Chips, btn, btn2, lnk, inp, h1, h2, Status, useDraft } from './ui';

const BLANK = { cond: '', tx: '', out: 'improved', sym: [], consent: false };

export default function DoctorPortal() {
  const { route, doctors, me, setMe, cases, requests, leads, decide, addCase, removeCase, toggleAccepting, registerDoctor, notify } = useApp();
  const doc = doctors[me] || Object.values(doctors)[0];
  const id = doc.id;
  const verified = doc.status === 'verified';
  const view = route.split('/')[1];
  const incoming = requests.filter((r) => r.doc === id);
  const mine = cases.filter((x) => x.doc === id);

  const [f, setF, resetF] = useDraft('doctor-case', BLANK, ['consent']);
  const [reg, setReg] = useState({ name: '', spec: '', city: '', licence: '' });
  const [regErr, setRegErr] = useState('');
  const valid = f.cond.trim() && f.tx.trim() && f.sym.length && f.consent;

  const publish = (e) => {
    e.preventDefault();
    if (!valid || !verified) return;
    addCase({ id: Date.now(), src: 'doctor', doc: id, cond: f.cond.trim(), sym: f.sym, tx: f.tx.trim(), out: f.out, open: false, alias: '' });
    resetF();
    notify('Case published. Patient searches now include it.');
  };
  const register = (e) => {
    e.preventDefault();
    if (reg.name.trim().length < 3 || !reg.spec.trim() || !reg.city.trim()) return setRegErr('Enter your name, specialty and city.');
    if (!/^[A-Za-z0-9-]{6,}$/.test(reg.licence.trim())) return setRegErr('Licence number needs at least 6 letters, digits or dashes.');
    setRegErr('');
    registerDoctor(reg);
    setReg({ name: '', spec: '', city: '', licence: '' });
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule pb-4 text-sm">
        <label className="flex items-center gap-2">Demo: signed in as
          <select aria-label="Signed in as" className="min-h-10 rounded border border-rule bg-white px-2" value={id} onChange={(e) => setMe(e.target.value)}>
            {Object.values(doctors).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <span className="text-ink-soft">{doc.spec}, {doc.city}</span>
        <Status s={doc.status} />
      </div>

      {!verified && (
        <p className="mb-8 max-w-2xl rounded border border-ink-soft px-4 py-3 text-sm">
          {doc.status === 'pending'
            ? <>Your licence is awaiting review. Until it is verified you are hidden from patients and cannot publish cases. <Link href="/admin" className="font-medium text-brand underline">Open admin to approve it (demo)</Link>.</>
            : 'This application was rejected.'}
        </p>
      )}

      {view === 'requests' && (
        <section>
          <h1 className={h1}>Requests</h1>
          <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
            {[['cases published', mine.length], ['patient searches matched you', leads[id] || 0], ['consultation requests', incoming.length]].map(([l, v]) => (
              <div key={l}><dd className="font-serif text-3xl">{v}</dd><dt className="text-sm text-ink-soft">{l}</dt></div>
            ))}
          </dl>
          {incoming.length === 0 ? (
            <p className="mt-8 max-w-xl text-ink-soft">No requests yet. Patients find you when their symptoms match cases you have shared. Share a case to be found sooner.</p>
          ) : (
            <ul className="mt-8 divide-y divide-rule border-y border-rule">
              {incoming.map((r) => (
                <li key={r.id} className="py-4 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="font-medium">Anonymous patient, wants {r.slot.toLowerCase()}</span><Status s={r.status} /></div>
                  <p className="text-ink-soft">Symptoms: {r.symptoms.join(', ') || 'none shared'}</p>
                  {r.msg && <p className="mt-1">“{r.msg}”</p>}
                  {r.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => decide(r.id, 'accepted')} className={btn}>Accept</button>
                      <button onClick={() => decide(r.id, 'declined')} className={btn2}>Decline</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {view === 'cases' && (
        <div className="grid gap-10 md:grid-cols-2">
          <section>
            <h1 className={h1}>Cases</h1>
            <p className="mt-2 text-ink-soft">Share an anonymised case. Patients with matching symptoms are pointed to you. Your draft is saved as you type.</p>
            <form onSubmit={publish} className="mt-5 space-y-4">
              <input aria-label="Diagnosis" className={inp} placeholder="Diagnosis (for example, POTS)" value={f.cond} onChange={(e) => setF({ ...f, cond: e.target.value })} />
              <Chips picked={f.sym} setPicked={(sym) => setF({ ...f, sym })} />
              <input aria-label="Treatment given" className={inp} placeholder="Treatment given" value={f.tx} onChange={(e) => setF({ ...f, tx: e.target.value })} />
              <select aria-label="Outcome" className={inp} value={f.out} onChange={(e) => setF({ ...f, out: e.target.value })}><option value="improved">Improved</option><option value="partial">Partly improved</option><option value="none">No change</option></select>
              <label className="flex gap-2 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} /> The patient consented and no identifying details are included.</label>
              <button className={btn} disabled={!valid || !verified}>{verified ? 'Publish case' : 'Verification required'}</button>
            </form>
          </section>
          <section className="md:pt-12">
            <h2 className={h2}>Your published cases</h2>
            {mine.length === 0 && <p className="mt-2 text-ink-soft">No cases yet.</p>}
            <ul className="mt-2 divide-y divide-rule border-y border-rule empty:hidden">
              {mine.map((x) => (
                <li key={x.id} className="py-3 text-sm">
                  <p className="font-medium">{x.cond}: {x.tx}</p>
                  <p className="text-ink-soft">{x.sym.join(', ')}. {OUT[x.out]}.</p>
                  <button onClick={() => removeCase(x.id, 'Case unpublished')} className={lnk}>Unpublish</button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {view === 'profile' && (
        <div className="grid gap-10 md:grid-cols-2">
          <section>
            <h1 className={h1}>Profile</h1>
            <dl className="mt-4 space-y-3 text-sm">
              {[['Name', doc.name], ['Specialty', doc.spec], ['City', doc.city], ['Licence', doc.licence]].map(([k, v]) => (
                <div key={k}><dt className="text-ink-soft">{k}</dt><dd className="text-base">{v}</dd></div>
              ))}
            </dl>
            {verified && (
              <label className="mt-6 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={doc.accepting} onChange={() => toggleAccepting(id)} /> Accepting new patients</label>
            )}
          </section>
          <section>
            <h2 className={h2}>Join as a doctor</h2>
            <p className="mt-1 text-sm text-ink-soft">Applications are checked against your medical council licence before you appear to patients.</p>
            <form onSubmit={register} className="mt-4 space-y-3">
              <input aria-label="Full name" className={inp} placeholder="Full name" value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} />
              <input aria-label="Specialty" className={inp} placeholder="Specialty" value={reg.spec} onChange={(e) => setReg({ ...reg, spec: e.target.value })} />
              <input aria-label="City" className={inp} placeholder="City" value={reg.city} onChange={(e) => setReg({ ...reg, city: e.target.value })} />
              <input aria-label="Licence number" className={inp} placeholder="Medical council licence number" value={reg.licence} onChange={(e) => setReg({ ...reg, licence: e.target.value })} />
              {regErr && <p role="alert" className="text-sm font-medium text-red-800">{regErr}</p>}
              <button className={btn}>Submit for verification</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
