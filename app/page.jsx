'use client';
import { AppProvider, useApp } from './lib/store';
import Bell from './components/Bell';
import FindTab from '../app/components/FindTab';
import MessagesTab from '../app/components/MessagesTab';
import JournalTab from '../app/components/JournalTab';
import InsightsTab from '../app/components/InsightsTab';
import DoctorsTab from '../app/components/DoctorsTab';
import ShareTab from '../app/components/ShareTab';
import DoctorPortal from '../app/components/DoctorPortal';
import IdeasTab from '../app/components/IdeasTab';
import { RequestModal, ProfileModal } from '../app/components/Modals';

const TABS = {
  find: FindTab, messages: MessagesTab, journal: JournalTab, insights: InsightsTab,
  doctors: DoctorsTab, share: ShareTab, portal: DoctorPortal, ideas: IdeasTab,
};

function Shell() {
  const app = useApp();

  if (app === null) {
    return null;
  }

  const { tab, setTab, requests, me, toast, resetDemo } = app;
  const pending = requests.filter((r) => r.doc === me && r.status === 'pending').length;
  const labels = [
    ['find', 'Find journeys'], ['messages', 'Messages'], ['journal', 'My journal'], ['insights', 'Insights'],
    ['doctors', 'Find a doctor'], ['share', 'Share my journey'], ['portal', pending ? `For doctors (${pending})` : 'For doctors'], ['ideas', 'Product ideas'],
  ];
  const Active = TABS[tab] || FindTab;

  return (
    <main className="min-h-screen bg-[#F5F7F8] text-[#17303A]">
      <div className="mx-auto max-w-4xl px-5 py-10">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-4xl leading-tight">Find people who have been where you are</h1>
          <Bell />
        </div>
        <p className="mt-2 max-w-xl text-slate-600">Compare your symptoms with anonymised patient journeys and doctor-verified cases. Peer experience only, never a prescription.</p>

        <nav className="mt-8 flex flex-wrap border-b border-slate-300" aria-label="Sections">
          {labels.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
              className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === id ? 'border-teal-800 text-teal-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>
          ))}
        </nav>

        <Active />

        <p className="mt-10 text-xs text-slate-500">
          Prototype with fictional data, saved only in this browser. Similarity uses simple symptom overlap (Jaccard) as a stand-in for a trained model. Do not enter real patient information.{' '}
          <button onClick={() => confirm('Reset all demo data in this browser?') && resetDemo()} className="underline">Reset demo data</button>
        </p>
      </div>
      <RequestModal />
      <ProfileModal />
      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-md bg-[#17303A] px-4 py-2 text-sm text-white shadow">{toast}</div>}
    </main>
  );
}

export default function Home() {
  return <AppProvider><Shell /></AppProvider>;
}