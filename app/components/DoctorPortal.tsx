'use client';
import { useState } from 'react';
import { useApp } from '../lib/store';
import { OUT } from '../lib/data';
import { Chips, btn, btn2, inp, box, Status, Empty } from '../ui';

export default function DoctorPortal() {
  const { doctors, me, setMe, cases, requests, leads, decide, addCase, removeCase, toggleAccepting, registerDoctor, approveDoctor, reports, resolveReport, notify } = useApp();
  const doc = doctors[me] || Object.values(doctors)[0];
  const id = doc.id;
  const verified = doc.status === 'verified';
  const incoming = requests.filter((r) => r.doc === id);
  const mine = cases.filter((x) => x.doc === id);

  const [f, setF] = useState({ cond: '', tx: '', out: 'improved', sym: [], consent: false });
  const [reg, setReg] = useState({ name: '', spec: '', city: '', licence: '' });
  const [regErr, setRegErr] = useState('');
  const valid = f.cond.trim() && f.tx.trim() && f.sym.length && f.consent;

  const publish = (e) => {
    e.preventDefault();
    if (!valid || !verified) return;
    addCase({ id: Date.now(), src: 'doctor', doc: id, cond: f.cond.trim(), sym: f.sym, tx: f.tx.trim(), out: f.out, open: false, alias: '' });
    setF({ cond: '', tx: '', out: 'improved', sym: [], consent: false });
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

  const pendingDocs = Object.values(doctors).filter((d) => d.status === 'pending');
  const openReports = reports.filter((r) => r.status === 'open');

  return (
    <section className="mt-6 space-y-6">
      <div className={`${box} flex flex-wrap items-center gap-3 p-4 text-sm`}>
        <label htmlFor="me">Preview as</label>
        <select id="me" className={`${inp} max-w-xs`} value={id} onChange={(e) => setMe(e.target.value)}>
          {Object.values(doctors).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <span className="text-slate-500">{doc.spec}, {doc.city}</span>
        <Status s={doc.status} />
        {verified && (
          <label className="ml-auto flex items-center gap-2"><input type="checkbox" checked={doc.accepting} onChange={() => toggleAccepting(id)} /> Accepting new patients</label>
        )}
      </div>
      {!verified && <p className="rounded bg-amber-100 px-4 py-2 text-sm text-amber-900">{doc.status === 'pending' ? 'Your licence is awaiting review. Until it is verified you are hidden from patients and cannot publish cases. Use the admin panel below to approve it.' : 'This application was rejected.'}</p>}

      <div className="grid gap-3 text-sm sm:grid-cols-3">
        {[['Cases published', mine.length], ['Patient searches that matched you', leads[id] || 0], ['Consultation requests', incoming.length]].map(([l, v]) => (
          <div key={l} className={`${box} p-4`}><p className="font-serif text-3xl">{v}</p><p className="text-slate-600">{l}</p></div>
        ))}
      </div>

      <div>
        <h2 className="mb-2 font-medium">Incoming requests</h2>
        {incoming.length === 0 && <Empty>None yet. Open Find journeys, search, and request a consultation with this doctor.</Empty>}
        <div className="space-y-2">
          {incoming.map((r) => (
            <div key={r.id} className={`${box} p-4 text-sm`}>
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
        <form onSubmit={publish} className={`${box} space-y-3 p-5`}>
          <h2 className="font-medium">Share an anonymised case</h2>
          <input aria-label="Diagnosis" className={inp} placeholder="Diagnosis (e.g. POTS)" value={f.cond} onChange={(e) => setF({ ...f, cond: e.target.value })} />
          <Chips picked={f.sym} setPicked={(sym) => setF({ ...f, sym })} />
          <input aria-label="Treatment given" className={inp} placeholder="Treatment given" value={f.tx} onChange={(e) => setF({ ...f, tx: e.target.value })} />
          <select aria-label="Outcome" className={inp} value={f.out} onChange={(e) => setF({ ...f, out: e.target.value })}><option value="improved">Improved</option><option value="partial">Partly improved</option><option value="none">No change</option></select>
          <label className="flex gap-2 text-xs text-slate-600"><input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} /> The patient consented and no identifying details are included.</label>
          <button className={btn} disabled={!valid || !verified}>{verified ? 'Publish case' : 'Verification required'}</button>
        </form>
        <div>
          <h2 className="mb-2 font-medium">Your published cases</h2>
          {mine.length === 0 && <Empty>No cases yet.</Empty>}
          <div className="space-y-2">
            {mine.map((x) => (
              <div key={x.id} className={`${box} p-3 text-sm`}>
                <p className="font-medium">{x.cond}: {x.tx}</p>
                <p className="text-slate-500">{x.sym.join(', ')}. {OUT[x.out]}.</p>
                <button onClick={() => { removeCase(x.id); notify('Unpublished'); }} className="mt-1 text-xs text-slate-600 underline">Unpublish</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <details className={`${box} p-5`}>
        <summary className="cursor-pointer font-medium">Register as a doctor</summary>
        <form onSubmit={register} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input aria-label="Full name" className={inp} placeholder="Full name" value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} />
          <input aria-label="Specialty" className={inp} placeholder="Specialty" value={reg.spec} onChange={(e) => setReg({ ...reg, spec: e.target.value })} />
          <input aria-label="City" className={inp} placeholder="City" value={reg.city} onChange={(e) => setReg({ ...reg, city: e.target.value })} />
          <input aria-label="Licence number" className={inp} placeholder="Medical council licence number" value={reg.licence} onChange={(e) => setReg({ ...reg, licence: e.target.value })} />
          {regErr && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{regErr}</p>}
          <div className="sm:col-span-2"><button className={btn}>Submit for verification</button></div>
        </form>
      </details>

      <div className={`${box} p-5`}>
        <h2 className="font-medium">Admin preview</h2>
        <p className="mb-3 text-xs text-slate-500">In production this is a separate, access-controlled tool. Here it lets you test verification and moderation.</p>
        <h3 className="mb-1 text-sm font-medium">Doctor applications</h3>
        {pendingDocs.length === 0 && <Empty>No pending applications.</Empty>}
        {pendingDocs.map((d) => (
          <div key={d.id} className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 p-3 text-sm">
            <span><b>{d.name}</b>, {d.spec}, {d.city}. Licence {d.licence}</span>
            <span className="flex gap-2"><button onClick={() => approveDoctor(d.id, true)} className={btn}>Verify</button><button onClick={() => approveDoctor(d.id, false)} className={btn2}>Reject</button></span>
          </div>
        ))}
        <h3 className="mb-1 mt-4 text-sm font-medium">Reported journeys</h3>
        {openReports.length === 0 && <Empty>No open reports.</Empty>}
        {openReports.map((r) => {
          const k = cases.find((x) => x.id === r.caseId);
          if (!k) return null;
          return (
            <div key={r.id} className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 p-3 text-sm">
              <span><b>{r.reason}</b>: {k.cond}, {k.tx}</span>
              <span className="flex gap-2"><button onClick={() => resolveReport(r.id, 'remove')} className={btn}>Remove journey</button><button onClick={() => resolveReport(r.id, 'keep')} className={btn2}>Keep visible</button></span>
            </div>
          );
        })}
      </div>
    </section>
  );
}