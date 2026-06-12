import {
  Hash,
  BookOpen,
  Storefront,
  Microphone,
  ChartBar,
  ShieldCheck,
} from '@phosphor-icons/react/dist/ssr';
import Reveal from './Reveal';
import s from './landing.module.css';

const features = [
  {
    Icon: Hash,
    heading: 'Channel per job',
    body: 'Every open role lives in its own channel — history, candidates, agent thread, and listing all in one place.',
  },
  {
    Icon: BookOpen,
    heading: 'Reads your context, read-only',
    body: 'Connect Notion, GitHub, and Slack as read-only sources. The agent ingests them; it never writes back.',
  },
  {
    Icon: Storefront,
    heading: 'Owned public job board',
    body: 'Roles publish to /c/{org-slug}. Your domain, your brand. No ATS vendor in the URL.',
  },
  {
    Icon: Microphone,
    heading: 'Voice interviews w/ live exercises',
    body: 'OpenAI Realtime over WebRTC. Candidates speak, the agent listens and generates coding exercises on the fly.',
  },
  {
    Icon: ChartBar,
    heading: 'Evidence-based ranking',
    body: 'Every rank is backed by cited signals — interview answers, code quality, repo activity. No black boxes.',
  },
  {
    Icon: ShieldCheck,
    heading: 'Tenant-isolated & audited',
    body: 'Every query is scoped by org. Agent handoffs use distilled briefs — the interview agent never sees raw recruiter threads.',
  },
];

export default function Features() {
  return (
    <section id="features" className={s.features} aria-labelledby="features-heading">
      <div className={s.container}>
        <Reveal>
          <div className={s.sectionLabel}>Features</div>
          <h2 id="features-heading" className={s.sectionHeading}>
            Everything a hiring team needs.
            <br />
            Nothing it doesn&apos;t.
          </h2>
        </Reveal>

        <div className={s.featuresGrid}>
          {features.map(({ Icon, heading, body }, i) => (
            <Reveal key={heading} delay={i * 0.07}>
              <article className={s.featureCard}>
                <div className={s.featureIconWrap} aria-hidden="true">
                  <Icon size={20} weight="duotone" />
                </div>
                <h3 className={s.featureHeading}>{heading}</h3>
                <p className={s.featureBody}>{body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
