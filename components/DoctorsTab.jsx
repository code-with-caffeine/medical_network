'use client';
import { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { rate } from '../lib/data';
import { btn2, lnk, inp, box, h1 } from './ui';

export default function DoctorsTab() {
  const { doctors, cases, requests, setModalDoc, setProfileDoc } = useApp();
  const [spec, setSpec] = useState('all');
  const [city, setCity] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(false);

  const verified = Object.values(doctors).filter((d) => d.status === 'verified');
  const specs = [...new Set(verified.map((d) => d.spec))];
  const list = useMemo(() => verified
    .filter((d) => (spec === 'all' || d.spec === spec) && d.city.toLowerCase().includes(city.trim().toLowerCase()) && (!onlyOpen || d.accepting))
    .map((d) => { const mine = cases.filter((x) => x.doc === d.id); return { ...d, n: mine.length, rate: rate(mine) }; })
    .sort((a, b) => b.n - a.n), [verified, spec, city, onlyOpen, cases]);

  return (
    <div>
      <h1 className={h1}>Find a doctor</h1>
      <p className="mt-2 max-w-xl text-ink-soft">Every doctor here has a verified licence and has shared real cases, so you can see their track record before you ask.</p>
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-rule py-2 text-sm">
        <select aria-label="Specialty" className="min-h-10 rounded border border-rule bg-white px-2" value={spec} onChange={(e) => setSpec(e.target.value)}>
          <option value="all">All specialties</option>{specs.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input aria-label="City" className={`${inp} !min-h-10 max-w-[11rem]`} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <label className="flex min-h-10 items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Accepting patients</label>
        <span className="ml-auto text-ink-soft">{list.length} {list.length === 1 ? 'doctor' : 'doctors'}</span>
      </div>
      {list.length === 0 && <p className="mt-4 text-ink-soft">No doctors match these filters. Clear a filter to see more.</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {list.map((d) => {
          const sent = requests.find((r) => r.doc === d.id && r.status === 'pending');
          return (
            <div key={d.id} className={`${box} p-4`}>
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-medium">{d.name}</p><p className="text-sm text-ink-soft">{d.spec}, {d.city}</p></div>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs ${d.accepting ? 'border-brand text-brand' : 'border-rule text-ink-soft'}`}>{d.accepting ? 'Accepting' : 'Full'}</span>
              </div>
              <p className="mt-2 text-sm">{d.n ? `${d.n} cases shared, ${d.rate}% weighted improvement` : 'No cases shared yet'}</p>
              <div className="mt-3 flex items-center gap-3">
                <button onClick={() => setModalDoc(d.id)} disabled={!d.accepting || !!sent} className={btn2}>{sent ? 'Request pending' : 'Request consultation'}</button>
                <button onClick={() => setProfileDoc(d.id)} className={lnk}>Profile</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
