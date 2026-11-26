'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { time } from '../lib/data';
import { btn, btn2, lnk, inp, box, h1, h2, Status } from './ui';

export default function MessagesTab() {
  const { cases, doctors, threads, unread, requests, cancelRequest, activeThread, selectThread, sendMsg, markRequestsSeen, go } = useApp();
  const [draft, setDraft] = useState('');
  const box_ = useRef(null);
  const active = cases.find((x) => x.id === activeThread);
  const ids = Object.keys(threads).filter((id) => cases.some((x) => String(x.id) === id));
  const len = active ? (threads[active.id] || []).length : 0;

  useEffect(() => { markRequestsSeen(); }, [requests]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (box_.current) box_.current.scrollTop = box_.current.scrollHeight; }, [len, activeThread]);
  useEffect(() => { if (!activeThread && ids.length) selectThread(cases.find((x) => String(x.id) === ids[0]).id); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !active) return;
    sendMsg(active.id, text);
    setDraft('');
  };

  return (
    <div className="space-y-10">
      <section>
        <h1 className={h1}>Messages</h1>
        {ids.length === 0 ? (
          <div className="mt-4 max-w-xl">
            <p className="text-ink-soft">No conversations yet. Find a journey from someone who recovered and choose Message this peer.</p>
            <button onClick={() => go('find')} className={`${btn} mt-3`}>Find journeys</button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-[14rem_1fr]">
            <ul className="space-y-1" aria-label="Conversations">
              {ids.map((id) => {
                const k = cases.find((x) => String(x.id) === id);
                return (
                  <li key={id}>
                    <button onClick={() => selectThread(k.id)} aria-current={activeThread === k.id ? 'true' : undefined}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left ${activeThread === k.id ? 'bg-white ring-1 ring-brand' : 'hover:bg-white'}`}>
                      <span><span className="block font-medium">{k.alias}</span><span className="text-sm text-ink-soft">{k.cond}</span></span>
                      {unread[id] && <span className="h-2.5 w-2.5 rounded-full bg-brand" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className={`${box} flex min-h-[20rem] flex-col p-4`}>
              {!active ? <p className="m-auto text-ink-soft">Select a conversation</p> : (<>
                <p className="border-b border-rule pb-2 text-sm text-ink-soft"><b className="font-medium text-ink">{active.alias}</b>, {active.cond}. Replies are simulated in this prototype.</p>
                <div ref={box_} className="max-h-96 flex-1 space-y-2 overflow-y-auto py-3" aria-live="polite">
                  {len === 0 && <p className="text-sm text-ink-soft">Say hello. Do not share names, phone numbers or other identifying details.</p>}
                  {(threads[active.id] || []).map((m, i) => (
                    <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : ''}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.from === 'me' ? 'bg-brand text-white' : 'bg-mist'}`}>
                        {m.text}<span className="ml-2 text-xs opacity-70">{time(m.ts)}</span>
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
        )}
      </section>

      <section>
        <h2 className={h2}>Consultation requests</h2>
        {requests.length === 0 && (
          <div className="mt-2">
            <p className="text-ink-soft">No requests yet. Search for journeys, then ask a doctor for a consultation.</p>
            <button onClick={() => go('doctors')} className={`${lnk} mt-1`}>Browse doctors</button>
          </div>
        )}
        <ul className="mt-2 divide-y divide-rule border-y border-rule empty:hidden">
          {requests.map((r) => (
            <li key={r.id} className="py-3 text-sm">
              <div className="flex items-center justify-between"><span className="font-medium">{doctors[r.doc]?.name}</span><Status s={r.status} /></div>
              <p className="text-ink-soft">Preferred time: {r.slot}. Symptoms shared: {r.symptoms.join(', ') || 'none'}.</p>
              {r.msg && <p className="mt-1">“{r.msg}”</p>}
              {r.status === 'accepted' && <p className="mt-1 font-medium text-brand">Accepted. The clinic will contact you for a {r.slot.toLowerCase()} slot.</p>}
              {r.status === 'pending' && <button onClick={() => cancelRequest(r.id)} className={lnk}>Cancel request</button>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
