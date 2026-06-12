'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import s from './landing.module.css';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`${s.header} ${scrolled ? s.headerScrolled : ''}`} role="banner">
      <div className={`${s.container} ${s.headerInner}`}>
        <Link href="/" className={s.headerWordmark} aria-label="Yougrep home">
          You<span className={s.headerWordmarkAccent}>grep</span>
        </Link>

        <nav className={s.headerNav} aria-label="Primary navigation">
          <Link href="#surfaces" className={s.headerNavLink}>
            Product
          </Link>
          <Link href="#how-it-works" className={s.headerNavLink}>
            How it works
          </Link>
          <Link href="#features" className={s.headerNavLink}>
            Features
          </Link>
          <Link href="#developers" className={s.headerNavLink}>
            Developers
          </Link>
        </nav>

        <div className={s.headerActions}>
          <Link href="/sign-in" className={`${s.btn} ${s.btnGhost}`}>
            Sign in
          </Link>
          <Link href="/sign-up" className={`${s.btn} ${s.btnPrimary}`}>
            Start hiring
          </Link>
        </div>
      </div>
    </header>
  );
}
