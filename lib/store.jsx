'use client';
// Global app state. Everything persisted lives in localStorage under KEY.
// To go real: replace each setter below with an API call and load the initial state from your backend.
// Routing is hash based (#/find, #/d/requests) so Back and deep links work without extra route files.
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SEED, SEED_DOCTORS, rank, aliasFor, todayStr, addDays } from './data';

const KEY = 'medmatch-v2';
export const ROUTES = ['find', 'journal', 'messages', 'doctors', 'insights', 'share', 'd/requests', 'd/cases', 'd/profile'];
const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  // Persisted
  const [cases, setCases] = useState(SEED);
  const [doctors, setDoctors] = useState(SEED_DOCTORS);
  const [requests, setRequests] = useState([]);
  const [threads, setThreads] = useState({});
  const [unread, setUnread] = useState({});
  const [saved, setSaved] = useState([]);
  const [leads, setLeads] = useState({});
  const [journal, setJournal] = useState([]);
  const [reports, setReports] = useState([]);
  const [notes, setNotes] = useState([]);
  // Not persisted
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState('find');
  const [picked, setPicked] = useState([]);
  const [searched, setSearched] = useState(null);
  const [modalDoc, setModalDoc] = useState(null);
  const [profileDoc, setProfileDoc] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [shareDraft, setShareDraft] = useState(null);
  const [me, setMe] = useState('d1');
  const [toast, setToast] = useState(null);

  const live = useRef({});
  live.current = { route, activeThread };
  const pathname = usePathname();

  // Hash routing. Only the main app reads the hash, so /admin does not reset where you were.
  useEffect(() => {
    if (pathname !== '/') return;
    const read = () => {
      const r = window.location.hash.replace(/^#\/?/, '');
      setRoute(ROUTES.includes(r) ? r : 'find');
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [pathname]);
  const go = (r) => { window.location.hash = `#/${r}`; };
  const mode = route.startsWith('d/') ? 'doctor' : 'patient';

  // Load and save
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        d.cases && setCases(d.cases); d.doctors && setDoctors(d.doctors); d.requests && setRequests(d.requests);
        d.threads && setThreads(d.threads); d.unread && setUnread(d.unread); d.saved && setSaved(d.saved); d.leads && setLeads(d.leads);
        d.journal && setJournal(d.journal); d.reports && setReports(d.reports); d.notes && setNotes(d.notes);
        if (d.picked) setPicked(d.picked);
        if (d.searched) setSearched(d.searched); // a refresh keeps your last search
      }
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify({ cases, doctors, requests, threads, unread, saved, leads, journal, reports, notes, picked, searched })); } catch {}
  }, [ready, cases, doctors, requests, threads, unread, saved, leads, journal, reports, notes, picked, searched]);

  // Toast with optional action (used for Undo)
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.action ? 7000 : 3000);
    return () => clearTimeout(t);
  }, [toast]);
  const notify = (msg, action) => setToast({ msg, action, id: Date.now() });
  const dismissToast = () => setToast(null);

  const hidden = useMemo(() => new Set(reports.filter((r) => r.status === 'open').map((r) => r.caseId)), [reports]);
  const addNote = (text) => setNotes((n) => [{ id: Date.now() + Math.random(), text, ts: Date.now(), read: false }, ...n].slice(0, 30));
  const markNotesRead = () => setNotes((n) => n.map((x) => ({ ...x, read: true })));

  // ---- Search. count=false is used for live chip toggles so they do not inflate doctor lead counts.
  const search = (list, count = true) => {
    const l = [...new Set(list)];
    setPicked(l);
    if (!l.length) return setSearched(null);
    setSearched(l);
    if (count) {
      const ids = new Set(rank(l, cases, doctors, hidden).filter((x) => x.src === 'doctor').map((x) => x.doc));
      setLeads((s) => { const n = { ...s }; ids.forEach((id) => (n[id] = (n[id] || 0) + 1)); return n; });
    }
  };
  const toggleSave = (id) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // ---- Consultation requests
  const sendRequest = ({ doc, msg, slot }) => {
    setRequests((r) => [{ id: Date.now(), doc, msg: msg.trim(), slot, symptoms: searched || [], status: 'pending', seen: true, ts: Date.now() }, ...r]);
    notify(`Request sent to ${doctors[doc].name}`);
    setModalDoc(null);
  };
  const cancelRequest = (id) => setRequests((r) => r.filter((x) => x.id !== id));
  const decide = (id, status) => {
    const r = requests.find((x) => x.id === id);
    setRequests((rs) => rs.map((x) => (x.id === id ? { ...x, status, seen: false } : x)));
    if (r) addNote(`${doctors[r.doc].name} ${status} your consultation request`);
    notify(status === 'accepted' ? 'Request accepted. The patient is notified.' : 'Request declined');
  };
  const markRequestsSeen = () => setRequests((rs) => (rs.some((r) => r.seen === false) ? rs.map((r) => ({ ...r, seen: true })) : rs));

  // ---- Peer chat (replies are simulated)
  const selectThread = (id) => { setActiveThread(id); setUnread((u) => (u[id] ? { ...u, [id]: false } : u)); };
  const openThread = (id) => {
    setThreads((t) => (t[id] ? t : { ...t, [id]: [] }));
    selectThread(id);
    go('messages');
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
      const viewing = live.current.route === 'messages' && live.current.activeThread === id;
      if (!viewing) setUnread((u) => ({ ...u, [id]: true }));
      addNote(`${k.alias} replied to your message`);
    }, 1200);
  };

  // ---- Cases and moderation
  const addCase = (x) => setCases((cs) => [...cs, { ts: Date.now(), alias: aliasFor(Date.now()), ...x }]);
  const dropCase = (id) => { setCases((cs) => cs.filter((x) => x.id !== id)); setSaved((s) => s.filter((x) => x !== id)); };
  const removeCase = (id, label = 'Removed') => {
    const k = cases.find((x) => x.id === id);
    if (!k) return;
    const wasSaved = saved.includes(id);
    dropCase(id);
    notify(label, { label: 'Undo', fn: () => { setCases((cs) => [...cs, k]); if (wasSaved) setSaved((s) => [...s, id]); } });
  };
  const reportCase = (caseId, reason) => {
    const id = Date.now();
    setReports((r) => [{ id, caseId, reason, status: 'open', ts: id }, ...r]);
    notify('Reported and hidden from your results.', { label: 'Undo', fn: () => setReports((r) => r.filter((x) => x.id !== id)) });
  };
  const resolveReport = (rid, verdict) => {
    const r = reports.find((x) => x.id === rid);
    if (!r) return;
    if (verdict === 'remove') dropCase(r.caseId);
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
  const removeJournal = (id) => {
    const e = journal.find((x) => x.id === id);
    if (!e) return;
    setJournal((j) => j.filter((x) => x.id !== id));
    notify('Entry deleted', { label: 'Undo', fn: () => setJournal((j) => [...j, e]) });
  };
  const clearJournal = () => {
    const all = journal;
    setJournal([]);
    notify('Journal cleared', { label: 'Undo', fn: () => setJournal(all) });
  };
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
    try {
      localStorage.removeItem(KEY);
      Object.keys(localStorage).filter((k) => k.startsWith('mm-draft-')).forEach((k) => localStorage.removeItem(k));
    } catch {}
    setCases(SEED); setDoctors(SEED_DOCTORS); setRequests([]); setThreads({}); setUnread({}); setSaved([]); setLeads({});
    setJournal([]); setReports([]); setNotes([]); setSearched(null); setPicked([]); setActiveThread(null); setMe('d1');
    notify('Demo data reset');
  };

  const value = {
    cases, doctors, requests, threads, unread, saved, leads, journal, reports, notes, hidden,
    route, mode, go, picked, setPicked, searched, modalDoc, setModalDoc, profileDoc, setProfileDoc,
    activeThread, selectThread, shareDraft, setShareDraft, me, setMe, toast, dismissToast,
    notify, addNote, markNotesRead, search, toggleSave, sendRequest, cancelRequest, decide, markRequestsSeen,
    openThread, sendMsg, addCase, removeCase, reportCase, resolveReport,
    registerDoctor, approveDoctor, toggleAccepting, addJournal, removeJournal, clearJournal, loadSampleJournal, resetDemo,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
