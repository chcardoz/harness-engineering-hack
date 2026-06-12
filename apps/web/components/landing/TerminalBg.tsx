'use client';

import { useEffect, useRef } from 'react';

const LINES = [
  'grep -r "postgres-engineer" ./candidates --include="*.json"',
  'match: candidates/alice-chen.json:  "role": "postgres-engineer"',
  'match: candidates/bob-patel.json:   "role": "postgres-engineer"',
  'yougrep search --job="frontend-lead" --scored',
  '  ✓ alice-chen       score: 94  evidence: 3 signals',
  '  ✓ priya-s          score: 87  evidence: 5 signals',
  '  ○ derek-h          score: 61  evidence: 2 signals',
  'agent run --channel=#postgres-engineer --task=draft-listing',
  'reading context: notion://engineering-wiki … ok',
  'reading context: github://org/backend-monorepo … ok',
  'draft saved → review at /c/acme-corp/postgres-engineer/listing',
  'yougrep interview --candidate=alice-chen --voice --exercises=2',
  'session started · ephemeral credential minted · WebRTC ready',
  'grep -r "staff-eng" ./pipeline | sort -k2 -rn | head -5',
  'pipeline/staff-eng: 12 candidates · 4 interviewed · 2 shortlisted',
  'agent run --channel=#staff-engineer --task=rank',
  '  ranking complete · 2 ready for hiring manager review',
];

const DELAY_PER_LINE = 140; // ms between starting each line

export default function TerminalBg() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let lineIndex = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function addLine() {
      if (cancelled || !container) return;
      const line = LINES[lineIndex % LINES.length] ?? '';
      lineIndex++;

      const el = document.createElement('div');
      el.textContent = line;
      el.style.cssText = [
        'opacity: 0',
        'transition: opacity 0.6s ease',
        'white-space: nowrap',
        'overflow: hidden',
        'text-overflow: ellipsis',
      ].join(';');

      container.appendChild(el);

      // Fade in
      const t1 = setTimeout(() => {
        el.style.opacity = '1';
      }, 20);
      // Fade out after 8s
      const t2 = setTimeout(() => {
        el.style.opacity = '0';
      }, 6000);
      // Remove after fade
      const t3 = setTimeout(() => {
        el.remove();
      }, 6700);
      timeouts.push(t1, t2, t3);

      // Schedule next line
      const t4 = setTimeout(addLine, DELAY_PER_LINE);
      timeouts.push(t4);
    }

    addLine();

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px 48px',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        lineHeight: '1.7',
        color: 'rgba(11, 11, 12, 0.055)',
        pointerEvents: 'none',
        overflow: 'hidden',
        letterSpacing: '0.01em',
      }}
      ref={containerRef}
    />
  );
}
