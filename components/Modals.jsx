'use client';
// Consultation request form and doctor profile. Both are rendered once, from the layout.
import { useState } from 'react';
import { useApp } from '../lib/store';
import { rate } from '../lib/data';
import { btn, btn2, inp, h2, Modal, Status } from './ui';

export function RequestModal() {
  const { modalDoc, setModalDoc, doctors, searched, sendRequest } = useApp();
  const [msg, setMsg] = useState('');
  const [slot, setSlot] = useState('This week');
  if (!modalDoc || !doctors[modalDoc]) return null;
  const submit = (e) => { e.preventDefault(); sendRequest({ doc: modalDoc, msg, slot }); setMsg(''); setSlot('This week'); };
  return (
    <Modal title="Request consultation" onClose={() => setModalDoc(null)}>
      <form onSubmit={submit} className="space-y-3">
        <h2 className={h2}>Ask {doctors[modalDoc].name} for a consultation</h2>
        <p className="text-sm text-ink-soft">{searched?.length ? `Your symptoms will be shared: ${searched.join(', ')}.` : 'No symptoms selected. Search first to share them.'} Your name is not shared.</p>
        <textarea autoFocus aria-label="Message" rows={3} className={inp} placeholder="Anything the doctor should know (optional)" value={msg} onChange={(e) => setMsg(e.target.value)} />
        <select aria-label="Preferred time" className={inp} value={slot} onChange={(e) => setSlot(e.target.value)}><option>This week</option><option>Next week</option><option>Anytime</option></select>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setModalDoc(null)} className={btn2}>Cancel</button>
          <button className={btn}>Send request</button>
        </div>
      </form>
    </Modal>
  );
}

export function ProfileModal() {
  const { profileDoc, setProfileDoc, setModalDoc, doctors, cases } = useApp();
  const d = profileDoc && doctors[profileDoc];
  if (!d) return null;
  const mine = cases.filter((x) => x.doc === d.id);
  const byCond = {};
  mine.forEach((x) => (byCond[x.cond] ||= []).push(x));
  return (
    <Modal title="Doctor profile" onClose={() => setProfileDoc(null)}>
      <div className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div><h2 className={h2}>{d.name}</h2><p className="text-ink-soft">{d.spec}, {d.city}</p></div>
          <Status s={d.status} />
        </div>
        <p>Licence {d.licence}. {d.accepting ? 'Accepting new patients.' : 'Not accepting new patients right now.'}</p>
        <div>
          <p className="mb-1 font-medium">Cases shared ({mine.length})</p>
          {mine.length === 0 && <p className="text-ink-soft">None yet.</p>}
          {Object.entries(byCond).map(([c, l]) => <p key={c}>{c}: {l.length} {l.length === 1 ? 'case' : 'cases'}, {rate(l)}% weighted improvement</p>)}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => setProfileDoc(null)} className={btn2}>Close</button>
          <button disabled={!d.accepting || d.status !== 'verified'} onClick={() => { setProfileDoc(null); setModalDoc(d.id); }} className={btn}>Request consultation</button>
        </div>
      </div>
    </Modal>
  );
}
