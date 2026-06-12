import { Plus, BookOpenText, MicrophoneStage } from '@phosphor-icons/react/dist/ssr';
import Reveal from './Reveal';
import s from './landing.module.css';

const steps = [
  {
    number: '01',
    Icon: Plus,
    heading: 'Create a job channel & connect context',
    body: 'Open a new channel for the role. Connect your Notion wiki, GitHub repo, or Slack workspace — read-only. The agent ingests them as context.',
  },
  {
    number: '02',
    Icon: BookOpenText,
    heading: 'Agent drafts the listing, you publish to your board',
    body: "Your agent synthesises a job listing from the connected context. Review, edit, confirm — it publishes to your org's own public board at /c/{org}.",
  },
  {
    number: '03',
    Icon: MicrophoneStage,
    heading: 'Candidates interview by voice, you get ranked results',
    body: 'Candidates enter a live voice interview with generated coding exercises. The agent ranks every applicant with cited evidence so you can decide fast.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className={s.howItWorks} aria-labelledby="hiw-heading">
      <div className={s.container}>
        <Reveal>
          <div className={s.sectionLabel}>How it works</div>
          <h2 id="hiw-heading" className={s.sectionHeading}>
            From opening to offer
            <br />
            in three moves.
          </h2>
        </Reveal>

        <div className={s.stepsGrid} role="list">
          {steps.map(({ number, Icon, heading, body }, i) => (
            <Reveal key={number} delay={i * 0.1}>
              <article className={s.step} role="listitem">
                <div className={s.stepNumber}>{number}</div>
                <div className={s.stepIconWrap} aria-hidden="true">
                  <Icon size={22} weight="duotone" />
                </div>
                <h3 className={s.stepHeading}>{heading}</h3>
                <p className={s.stepBody}>{body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
