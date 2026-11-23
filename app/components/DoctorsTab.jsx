'use client';
import { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { rate } from '../lib/data';
import { btn2, inp, box, Empty } from '../ui';

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
    <section className="mt-6 space-y-4">
      <div className={`${box} flex flex-wrap items-center gap-3 px-4 py-3 text-sm`}>
        <select aria-label="Specialty" className="rounded border border-slate-300 px-2 py-1" value={spec} onChange={(e) => setSpec(e.target.value)}>
          <option value="all">All specialties</option>{specs.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input aria-label="City" className={`${inp} max-w-[11rem]`} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <label className="flex items-center gap-2"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Accepting patients</label>
        <span className="ml-auto text-slate-500">{list.length} doctors</span>
      </div>
      {list.length === 0 && <Empty>No doctors match these filters.</Empty>}
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((d) => {
          const sent = requests.find((r) => r.doc === d.id && r.status === 'pending');
          return (
            <div key={d.id} className={`${box} p-4`}>
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-medium">{d.name}</p><p className="text-sm text-slate-600">{d.spec}, {d.city}</p></div>
                <span className={`rounded px-2 py-0.5 text-xs ${d.accepting ? 'bg-teal-100 text-teal-900' : 'bg-slate-200 text-slate-700'}`}>{d.accepting ? 'Accepting' : 'Full'}</span>
              </div>
              <p className="mt-2 text-sm">{d.n ? `${d.n} cases shared, ${d.rate}% weighted improvement` : 'No cases shared yet'}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setModalDoc(d.id)} disabled={!d.accepting || !!sent} className={btn2}>{sent ? 'Request pending' : 'Request consultation'}</button>
                <button onClick={() => setProfileDoc(d.id)} className="text-sm underline">Profile</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}