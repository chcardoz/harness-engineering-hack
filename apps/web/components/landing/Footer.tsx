import Link from 'next/link';
import s from './landing.module.css';

const product = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Integrations', href: '#integrations' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Changelog', href: '/changelog' },
];

const developers = [
  { label: 'Docs', href: '/docs' },
  { label: 'API Reference', href: '/docs/api' },
  { label: 'Webhooks', href: '/docs/webhooks' },
  { label: 'Status', href: '/status' },
  { label: 'GitHub', href: 'https://github.com' },
];

const company = [
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Careers', href: '/careers' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={s.footer} role="contentinfo">
      <div className={s.container}>
        <div className={s.footerGrid}>
          {/* Brand column */}
          <div className={s.footerBrand}>
            <Link href="/" className={s.footerWordmark} aria-label="Yougrep home">
              You<span className={s.footerWordmarkAccent}>grep</span>
            </Link>
            <p className={s.footerTagline}>The recruiter workspace where every channel is a job.</p>
          </div>

          {/* Product */}
          <nav className={s.footerCol} aria-label="Product links">
            <div className={s.footerColHead}>Product</div>
            <ul className={s.footerLinks} role="list">
              {product.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className={s.footerLink}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Developers */}
          <nav className={s.footerCol} id="developers" aria-label="Developer links">
            <div className={s.footerColHead}>Developers</div>
            <ul className={s.footerLinks} role="list">
              {developers.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className={s.footerLink}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company */}
          <nav className={s.footerCol} aria-label="Company links">
            <div className={s.footerColHead}>Company</div>
            <ul className={s.footerLinks} role="list">
              {company.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className={s.footerLink}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={s.footerBottom}>
          <span className={s.footerCopy}>© {year} Yougrep, Inc. All rights reserved.</span>
          <div className={s.footerBottomLinks}>
            <Link href="/privacy" className={s.footerBottomLink}>
              Privacy
            </Link>
            <Link href="/terms" className={s.footerBottomLink}>
              Terms
            </Link>
            <Link href="/cookies" className={s.footerBottomLink}>
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
