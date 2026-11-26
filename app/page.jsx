'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '../lib/store';
import { TopBar, BottomBar, SearchStrip } from '../components/Nav';
import FindTab from '../components/FindTab';
import JournalTab from '../components/JournalTab';
import MessagesTab from '../components/MessagesTab';
import DoctorsTab from '../components/DoctorsTab';
import InsightsTab from '../components/InsightsTab';
import ShareTab from '../components/ShareTab';
import DoctorPortal from '../components/DoctorPortal';

const VIEWS = {
  find: FindTab, journal: JournalTab, messages: MessagesTab, doctors: DoctorsTab, insights: InsightsTab, share: ShareTab,
  'd/requests': DoctorPortal, 'd/cases': DoctorPortal, 'd/profile': DoctorPortal,
};
const TITLES = {
  find: 'Find journeys', journal: 'My journal', messages: 'Messages', doctors: 'Find a doctor', insights: 'Insights', share: 'Share my journey',
  'd/requests': 'Requests', 'd/cases': 'Cases', 'd/profile': 'Doctor profile',
};

export default function Home() {
  const { route } = useApp();
  const View = VIEWS[route] || FindTab;
  const main = useRef(null);
  const first = useRef(true);

  // On navigation: update the tab title, scroll to top and move focus to the content for keyboard and screen reader users.
  useEffect(() => {
    document.title = `${TITLES[route] || 'Humraahi'} | Humraahi`;
    if (first.current) { first.current = false; return; }
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [route]);

  return (
    <>
      <button onClick={() => main.current?.focus()} className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:[background:var(--surface)] focus:px-3 focus:py-2">Skip to content</button>
      <TopBar />
      <SearchStrip />
      <main ref={main} tabIndex={-1} className="mx-auto min-h-[70vh] max-w-5xl px-4 pb-28 pt-6 outline-none md:pb-16">
        <View />
        <p className="mt-16 max-w-2xl text-xs text-ink-soft">
          {/* Prototype with fictional data, saved only in this browser. Matching uses simple symptom overlap as a stand-in for a trained model. Do not enter real patient information.{' '} */}
          <Link href="/admin" className="inline-flex min-h-11 items-center underline">Demo tools</Link>
        </p>
      </main>
      <BottomBar />
    </>
  );
}
