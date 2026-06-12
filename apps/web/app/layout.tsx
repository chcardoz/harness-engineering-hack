import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Pixelify_Sans } from 'next/font/google';
import './globals.css';

const pixel = Pixelify_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-pixel',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Yougrep — the recruiter workspace where every channel is a job',
  description:
    'Yougrep is a Slack-like recruiter workspace. Every channel is one job opening with a long-running agent that drafts the listing, runs voice interviews, and ranks candidates with evidence.',
  metadataBase: new URL('http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${pixel.variable}`}>
      <body>{children}</body>
    </html>
  );
}
