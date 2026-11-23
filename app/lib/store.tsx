'use client';
// Global app state. Everything persisted lives in localStorage under KEY.
// To go real: replace each setter below with an API call and load the initial state from your backend.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { SEED, SEED_DOCTORS, SYMPTOMS, SYN, rank, aliasFor, todayStr, addDays } from './data';

const KEY = 'medmatch-v2';
const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  // Persisted
  const [cases, setCases] = useState(SEED);
  const [doctors, setDoctors] = useState(SEED_DOCTORS);
  const [requests, setRequests] = useState([]);
  const [threads, setThreads] = useState({});
  const [saved, setSaved] = useState([]);
  const [leads, setLeads] = useState({});
  const [journal, setJournal] = useState([]);
  const [reports, setReports] = useState([]);
  const [notes, setNotes] = useState([]);
  // Not persisted
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('find');
  const [picked, setPicked] = useState([]);
  const [searched, setSearched] = useState(null);
  const [modalDoc, setModalDoc] = useState(null);
  const [profileDoc, setProfileDoc] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [shareDraft, setShareDraft] = useState(null);
  const [me, setMe] = useState('d1');
  const [toast, setToast] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        d.cases && setCases(d.cases); d.doctors && setDoctors(d.doctors); d.requests && setRequests(d.requests);
        d.threads && setThreads(d.threads); d.saved && setSaved(d.saved); d.leads && setLeads(d.leads);
        d.journal && setJournal(d.journal); d.reports && setReports(d.reports); d.notes && setNotes(d.notes);
      }
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify({ cases, doctors, requests, threads, saved, leads, journal, reports, notes })); } catch {}
  }, [ready, cases, doctors, requests, threads, saved, leads, journal, reports, notes]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const hidden = useMemo(() => new Set(reports.filter((r) => r.status === 'open').map((r) => r.caseId)), [reports]);

  const notify = (m) => setToast(m);
  const addNote = (text) => setNotes((n) => [{ id: Date.now() + Math.random(), text, ts: Date.now(), read: false }, ...n].slice(0, 30));
  const markNotesRead = () => setNotes((n) => n.map((x) => ({ ...x, read: true })));

  // ---- Search
  const runSearch = () => {
    if (!picked.length) return;
    setSearched(picked);
    const ids = new Set(rank(picked, cases, doctors, hidden).filter((x) => x.src === 'doctor').map((x) => x.doc));
    setLeads((l) => { const n = { ...l }; ids.forEach((id) => (n[id] = (n[id] || 0) + 1)); return n; });
  };
  const parseDesc = (text) => {
    const t = text.toLowerCase();
    const found = new Set(picked);
    Object.entries(SYN).forEach(([k, v]) => t.includes(k) && found.add(v));
    SYMPTOMS.forEach((s) => t.includes(s) && found.add(s));
    const next = [...found];
    if (next.length === picked.length) return notify('No new symptoms recognised. Try different words or pick from the list.');
    setPicked(next);
    notify(`Added ${next.length - picked.length} symptom(s) from your description`);
  };
  const toggleSave = (id) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // ---- Consultation requests
  const sendRequest = ({ doc, msg, slot }) => {
    setRequests((r) => [{ id: Date.now(), doc, msg: msg.trim(), slot, symptoms: searched || [], status: 'pending', ts: Date.now() }, ...r]);
    notify(`Request sent to ${doctors[doc].name}`);
    setModalDoc(null);
  };
  const cancelRequest = (id) => setRequests((r) => r.filter((x) => x.id !== id));
  const decide = (id, status) => {
    const r = requests.find((x) => x.id === id);
    setRequests((rs) => rs.map((x) => (x.id === id ? { ...x, status } : x)));
    if (r) addNote(`${doctors[r.doc].name} ${status} your consultation request`);
    notify(status === 'accepted' ? 'Request accepted. The patient is notified.' : 'Request declined');
  };

  // ---- Peer chat (replies are simulated)
  const openThread = (id) => {
    setThreads((t) => (t[id] ? t : { ...t, [id]: [] }));
    setActiveThread(id);
    setTab('messages');
  };
  const sendMsg = (id, text) => {
    const k = cases.find((x) => x.id === id);
    if (!k) return;
    const n = (threads[id] || []).filter((m) => m.from === 'me').length;
    setThreads((t) => ({ ...t, [id]: [...(t[id] || []), { from: 'me', text, ts: Date.now() }] }));
    const replies = [
      `Hi, glad you reached out. ${k.tx.toLowerCase()} ${k.out === 'improved' ? 'made a real difference' : k.out === 'partial' ? 'helped a little' : 'did not do much'} for me.`,
      'It took a few weeks to notice anything. Keeping a daily symptom log helped me and my doctor.',
      'Please check with your own doctor before trying anything. Everyone responds differently.',
    ];
    setTimeout(() => {
      setThreads((t) => ({ ...t, [id]: [...(t[id] || []), { from: 'peer', text: replies[Math.min(n, replies.length - 1)], ts: Date.now() }] }));
      addNote(`${k.alias} replied to your message`);
    }, 1200);
  };

  // ---- Cases and moderation
  const addCase = (x) => setCases((cs) => [...cs, { ts: Date.now(), alias: aliasFor(Date.now()), ...x }]);
  const removeCase = (id) => {
    setCases((cs) => cs.filter((x) => x.id !== id));
    setSaved((s) => s.filter((x) => x !== id));
  };
  const reportCase = (caseId, reason) => {
    setReports((r) => [{ id: Date.now(), caseId, reason, status: 'open', ts: Date.now() }, ...r]);
    notify('Reported. It is hidden from your results while moderators review it.');
  };
  const resolveReport = (rid, verdict) => {
    const r = reports.find((x) => x.id === rid);
    if (!r) return;
    if (verdict === 'remove') removeCase(r.caseId);
    setReports((rs) => rs.map((x) => (x.id === rid ? { ...x, status: verdict === 'remove' ? 'upheld' : 'dismissed' } : x)));
    notify(verdict === 'remove' ? 'Journey removed' : 'Report dismissed, journey visible again');
  };

  // ---- Doctors
  const registerDoctor = ({ name, spec, city, licence }) => {
    const id = `d${Date.now()}`;
    setDoctors((d) => ({ ...d, [id]: { id, name: name.trim(), spec: spec.trim(), city: city.trim(), licence: licence.trim(), status: 'pending', accepting: true } }));
    setMe(id);
    notify('Application submitted. An admin will verify your licence.');
  };
  const approveDoctor = (id, ok) => {
    setDoctors((d) => ({ ...d, [id]: { ...d[id], status: ok ? 'verified' : 'rejected' } }));
    addNote(`${doctors[id].name}: licence ${ok ? 'verified' : 'rejected'}`);
    notify(ok ? 'Doctor verified and now visible to patients' : 'Application rejected');
  };
  const toggleAccepting = (id) => setDoctors((d) => ({ ...d, [id]: { ...d[id], accepting: !d[id].accepting } }));

  // ---- Journal
  const addJournal = (e) => setJournal((j) => [...j.filter((x) => x.date !== e.date), e]);
  const removeJournal = (id) => setJournal((j) => j.filter((x) => x.id !== id));
  const clearJournal = () => setJournal([]);
  const loadSampleJournal = () => {
    const sev = [8, 8, 7, 8, 7, 6, 7, 6, 5, 6, 5, 4, 4, 3];
    const sets = [['fatigue', 'dizzy on standing', 'palpitations'], ['fatigue', 'brain fog'], ['palpitations', 'fatigue']];
    const today = todayStr();
    setJournal(sev.map((s, i) => ({
      id: Date.now() + i, date: addDays(today, -(13 - i)), sev: s,
      sym: sets[i % 3].slice(0, s > 5 ? 3 : 2), tx: i >= 4 ? 'Salt + fluids' : '', note: '',
    })));
    notify('Sample journal loaded');
  };

  const resetDemo = () => {
    try { localStorage.removeItem(KEY); } catch {}
    setCases(SEED); setDoctors(SEED_DOCTORS); setRequests([]); setThreads({}); setSaved([]); setLeads({});
    setJournal([]); setReports([]); setNotes([]); setSearched(null); setPicked([]); setActiveThread(null); setMe('d1');
    notify('Demo data reset');
  };

  const value = {
    cases, doctors, requests, threads, saved, leads, journal, reports, notes, hidden,
    tab, setTab, picked, setPicked, searched, setSearched, modalDoc, setModalDoc, profileDoc, setProfileDoc,
    activeThread, setActiveThread, shareDraft, setShareDraft, me, setMe, toast,
    notify, addNote, markNotesRead, runSearch, parseDesc, toggleSave, sendRequest, cancelRequest, decide,
    openThread, sendMsg, addCase, removeCase, reportCase, resolveReport,
    registerDoctor, approveDoctor, toggleAccepting, addJournal, removeJournal, clearJournal, loadSampleJournal, resetDemo,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}