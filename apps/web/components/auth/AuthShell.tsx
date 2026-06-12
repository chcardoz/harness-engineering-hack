'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import s from './auth.module.css';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className={s.shell}>
      <nav className={s.nav} aria-label="Auth navigation">
        <Link href="/" className={s.wordmark} aria-label="Yougrep home">
          You<span className={s.wordmarkAccent}>grep</span>
        </Link>
      </nav>

      <main className={s.main}>
        <motion.div
          className={s.card}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={s.cardHeader}>
            <h1 className={s.heading}>{title}</h1>
            {subtitle ? <p className={s.subtitle}>{subtitle}</p> : null}
          </div>
          {children}
        </motion.div>
      </main>
    </div>
  );
}
