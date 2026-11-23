'use client';
import { useState } from 'react';
import { useApp } from '../lib/store';
import { time } from '../lib/data';
import { btn, inp, box, Status, Empty } from '../ui';

export default function MessagesTab() {
  const { cases, doctors, threads, requests, cancelRequest, activeThread, setActiveThread, sendMsg } = useApp();
  const [draft, setDraft] = useState('');
  const active = cases.find((x) => x.id === activeThread);
  const ids = Object.keys(threads);

  const submit = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !active) return;
    sendMsg(active.id, text);
    setDraft('');
  };

  return (
    <section className="mt-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className={`${box} p-3`}>
          <h2 className="mb-2 px-1 text-sm font-medium">Peer conversations</h2>
          {ids.length === 0 && <div className="px-1"><Empty>None yet. Find a journey and choose Message this peer.</Empty></div>}
          {ids.map((id) => {
            const k = cases.find((x) => String(x.id) === id);
            if (!k) return null;
            return (
              <button key={id} onClick={() => setActiveThread(k.id)} className={`block w-full rounded px-2 py-2 text-left text-sm ${activeThread === k.id ? 'bg-teal-50 text-teal-900' : 'hover:bg-slate-50'}`}>
                <span className="font-medium">{k.alias}</span><br /><span className="text-xs text-slate-500">{k.cond}</span>
              </button>
            );
          })}
        </div>
        <div className={`${box} flex min-h-[18rem] flex-col p-4 md:col-span-2`}>
          {!active ? <p className="m-auto text-sm text-slate-500">Select a conversation</p> : (<>
            <p className="border-b border-slate-100 pb-2 text-sm"><b>{active.alias}</b>, {active.cond}. Replies here are simulated in this prototype.</p>
            <div className="flex-1 space-y-2 overflow-y-auto py-3" aria-live="polite">
              {(threads[active.id] || []).length === 0 && <p className="text-sm text-slate-500">Say hello. Do not share names, phone numbers or other identifying details.</p>}
              {(threads[active.id] || []).map((m, i) => (
                <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : ''}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.from === 'me' ? 'bg-teal-800 text-white' : 'bg-slate-100'}`}>
                    {m.text}<span className="ml-2 text-[10px] opacity-60">{time(m.ts)}</span>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={submit} className="flex gap-2">
              <input aria-label="Message" className={inp} placeholder="Write a message" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button className={btn} disabled={!draft.trim()}>Send</button>
            </form>
          </>)}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-medium">Consultation requests</h2>
        {requests.length === 0 && <Empty>No requests yet. Search for journeys, then choose Request consultation on a doctor.</Empty>}
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className={`${box} p-4 text-sm`}>
              <div className="flex items-center justify-between"><span className="font-medium">{doctors[r.doc]?.name}</span><Status s={r.status} /></div>
              <p className="text-slate-600">Preferred time: {r.slot}. Symptoms shared: {r.symptoms.join(', ') || 'none'}.</p>
              {r.msg && <p className="mt-1">“{r.msg}”</p>}
              {r.status === 'accepted' && <p className="mt-1 text-teal-900">Accepted. The clinic will contact you for a {r.slot.toLowerCase()} slot.</p>}
              {r.status === 'pending' && <button onClick={() => cancelRequest(r.id)} className="mt-2 text-xs text-slate-600 underline">Cancel request</button>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}