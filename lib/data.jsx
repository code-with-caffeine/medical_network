// Shared constants, seed data and pure helpers. No React in here.

export const SYMPTOMS = ['fatigue', 'brain fog', 'palpitations', 'dizzy on standing', 'joint pain', 'widespread pain', 'poor sleep', 'headache', 'nausea', 'light sensitivity'];

// Stand-in for an LLM: maps everyday words to the symptom list above.
// Keys match at the start of a word, so "palpitation" also catches "palpitations".
export const SYN = {
  tired: 'fatigue', exhausted: 'fatigue', fatigue: 'fatigue', drained: 'fatigue', 'no energy': 'fatigue',
  fog: 'brain fog', concentrate: 'brain fog', forgetful: 'brain fog', 'cannot think': 'brain fog',
  racing: 'palpitations', palpitation: 'palpitations', heartbeat: 'palpitations', 'heart pounding': 'palpitations',
  dizzy: 'dizzy on standing', lightheaded: 'dizzy on standing', faint: 'dizzy on standing', 'when i stand': 'dizzy on standing',
  joint: 'joint pain', achy: 'widespread pain', 'all over': 'widespread pain', widespread: 'widespread pain', 'body pain': 'widespread pain',
  insomnia: 'poor sleep', "can't sleep": 'poor sleep', 'cant sleep': 'poor sleep', 'trouble sleeping': 'poor sleep', 'not sleeping': 'poor sleep', sleepless: 'poor sleep',
  headache: 'headache', migraine: 'headache', nausea: 'nausea', nauseous: 'nausea', sick: 'nausea',
  bright: 'light sensitivity', glare: 'light sensitivity', 'light sensitiv': 'light sensitivity',
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function parseSymptoms(text) {
  const t = text.toLowerCase().replace(/[‘’]/g, "'");
  const found = new Set();
  const hit = (k) => new RegExp(`(^|[^a-z])${esc(k)}`).test(t);
  Object.entries(SYN).forEach(([k, v]) => hit(k) && found.add(v));
  SYMPTOMS.forEach((s) => hit(s) && found.add(s));
  return [...found];
}

export const SEED_DOCTORS = {
  d1: { id: 'd1', name: 'Dr. Meera Iyer', spec: 'Cardiology (autonomic disorders)', city: 'Bengaluru', status: 'verified', accepting: true, licence: 'KMC-48213' },
  d2: { id: 'd2', name: 'Dr. Arjun Sen', spec: 'Rheumatology', city: 'Kolkata', status: 'verified', accepting: true, licence: 'WBMC-20455' },
  d3: { id: 'd3', name: 'Dr. Farah Khan', spec: 'Neurology (headache clinic)', city: 'Delhi', status: 'verified', accepting: false, licence: 'DMC-31877' },
  d4: { id: 'd4', name: 'Dr. Anita Rao', spec: 'Sleep medicine', city: 'Mumbai', status: 'verified', accepting: true, licence: 'MMC-77120' },
  d5: { id: 'd5', name: 'Dr. Kabir Shah', spec: 'General practice', city: 'Pune', status: 'pending', accepting: true, licence: 'MMC-90341' },
};

const BASE = 1700000000000;
export const aliasFor = (id) => `Peer #${4000 + (id % 1000) * 37}`;
const c = (id, src, doc, cond, sym, tx, out, open = true) => ({
  id, src, doc, cond, sym: sym.split(','), tx, out, open, alias: aliasFor(id), ts: BASE + id * 86400000,
});

export const SEED = [
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
  c(13, 'doctor', 'd4', 'Insomnia', 'poor sleep,fatigue,brain fog', 'Sleep restriction + CBT-I', 'improved'),
  c(14, 'doctor', 'd4', 'Insomnia', 'poor sleep,headache,fatigue', 'Sleep restriction + CBT-I', 'improved'),
  c(15, 'patient', null, 'Insomnia', 'poor sleep,fatigue', 'Over-the-counter sleep aids', 'none'),
  c(16, 'patient', null, 'Insomnia', 'poor sleep,brain fog', 'Sleep restriction + CBT-I', 'partial'),
];

export const SCORE = { improved: 1, partial: 0.5, none: 0 };
export const OUT = { improved: 'improved', partial: 'partly improved', none: 'no change' };

export const jac = (a, b) => a.filter((x) => b.includes(x)).length / (new Set([...a, ...b]).size || 1);

// Cases visible to a searcher: not their own, not under review, and doctor cases only from verified doctors.
export const visibleCases = (cases, doctors, hidden) =>
  cases.filter((x) => !hidden.has(x.id) && (x.src !== 'doctor' || doctors[x.doc]?.status === 'verified'));

export const rank = (sym, cases, doctors, hidden) =>
  visibleCases(cases, doctors, hidden)
    .filter((x) => !x.mine)
    .map((x) => ({ ...x, s: jac(sym, x.sym) }))
    .filter((x) => x.s > 0.15)
    .sort((a, b) => b.s - a.s);

export const rate = (list) => (list.length ? Math.round((list.reduce((a, x) => a + SCORE[x.out], 0) / list.length) * 100) : 0);

export const time = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const pad = (n) => String(n).padStart(2, '0');
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const addDays = (str, n) => { const d = new Date(`${str}T00:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const dayDiff = (a, b) => Math.round((new Date(`${a}T00:00:00`) - new Date(`${b}T00:00:00`)) / 864e5);
export const fmtDate = (str) => new Date(`${str}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' });
