'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight } from '@phosphor-icons/react';
import s from './landing.module.css';
import TerminalBg from './TerminalBg';

const ease = [0.22, 1, 0.36, 1] as const;

function Item({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section className={s.hero} aria-label="Hero">
      {/* Animated terminal grep background */}
      <div className={s.heroBg} aria-hidden="true">
        <TerminalBg />
      </div>

      <div className={s.heroContent}>
        <Item delay={0.05}>
          <span className={s.heroBadge}>
            <span className={s.heroBadgeDot} aria-hidden="true" />
            Recruiter workspace · AI-native
          </span>
        </Item>

        <Item delay={0.15}>
          <h1 className={s.heroWordmark}>
            You<span className={s.heroWordmarkAccent}>grep</span>
          </h1>
        </Item>

        <Item delay={0.25}>
          <p className={s.heroTagline}>
            The recruiter workspace where{' '}
            <span className={s.heroTaglineStrong}>every channel is a job.</span> A long-running
            agent reads your context, drafts the listing, runs voice interviews, and ranks
            candidates with evidence.
          </p>
        </Item>

        <Item delay={0.35}>
          <div className={s.heroActions}>
            <Link href="/sign-up" className={`${s.btn} ${s.btnPrimary} ${s.btnPrimaryLg}`}>
              Start hiring
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </Link>
            <Link href="/sign-in" className={`${s.btn} ${s.btnOutlineLg}`}>
              Sign in
            </Link>
          </div>
        </Item>

        <Item delay={0.45}>
          <div className={s.heroMeta}>
            <span>No ATS contract</span>
            <span className={s.heroMetaDivider} aria-hidden="true" />
            <span>Owned job board</span>
            <span className={s.heroMetaDivider} aria-hidden="true" />
            <span>SOC-2 ready</span>
          </div>
        </Item>
      </div>
    </section>
  );
}
