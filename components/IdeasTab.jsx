'use client';
import { h2 } from './ui';

const IDEAS = [
  ['Start narrow', 'Launch with conditions where patient experience runs ahead of the literature, such as POTS, long COVID and fibromyalgia, then expand.', false],
  ['Data quality labels', 'Doctor-verified and self-reported cases are kept apart, small samples are flagged, and Insights shows where the two sources disagree.', true],
  ['LLM-written summaries', 'Let people describe symptoms in their own words and get a plain-language summary. Prototype: keyword matching and template text.', false],
  ['Doctor decision support', 'Position the clinician tool as the main product to reduce liability and build trust. Prototype: doctor workspace with verification and stats.', true],
  ['Trust and moderation', 'Licence verification for doctors, and reporting that hides a journey while moderators review it.', true],
  ['Retention', 'A private symptom journal keeps people coming back after they find answers, and recovered members appear as mentors.', true],
  ['Consent and privacy', 'Explicit consent, de-identification, HIPAA/GDPR-style review and regional rules (India: DPDP Act) before real data.', false],
  ['Real backend', 'Auth, a database, licence checks against the medical council register, and server-side matching with a trained model.', false],
];

export default function IdeasTab() {
  return (
    <section>
      <h2 className={h2}>Product ideas</h2>
      <ul className="mt-3 divide-y divide-rule border-y border-rule">
        {IDEAS.map(([t, d, done]) => (
          <li key={t} className="py-3">
            <p className="font-medium">{t}{done && <span className="ml-2 rounded-full border border-brand px-2 py-0.5 text-xs font-normal text-brand">In prototype</span>}</p>
            <p className="mt-0.5 max-w-2xl text-sm text-ink-soft">{d}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
