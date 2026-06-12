import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import Reveal from './Reveal';
import s from './landing.module.css';

export default function CTA() {
  return (
    <section className={s.ctaSection} aria-labelledby="cta-heading">
      <div className={s.container}>
        <Reveal>
          <div className={s.ctaBand}>
            <div className={s.ctaBandBg} aria-hidden="true" />
            <h2 id="cta-heading" className={s.ctaHeading}>
              Ready to hire faster
              <br />
              with <span className={s.ctaHeadingAccent}>AI that knows your stack?</span>
            </h2>
            <p className={s.ctaSubhead}>
              Open a job channel, connect your context, and let the agent do the heavy lifting —
              from draft to ranked candidates.
            </p>
            <div className={s.ctaActions}>
              <Link href="/sign-up" className={s.btnPrimaryOnDark}>
                Start hiring free
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
              <Link href="#how-it-works" className={s.btnGhostOnDark}>
                See how it works
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
