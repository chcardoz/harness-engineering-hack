import type { SVGProps } from 'react';

/* ─── Minimal inline SVG marks / wordmark chips ───────────────────────── */
/* All marks are monochrome (currentColor) to stay uniform in the marquee. */

export function NotionMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-label="Notion"
      role="img"
      {...props}
    >
      <rect
        x="3"
        y="2"
        width="12"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M6 6h6M6 9.5h6M6 13h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GitHubMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-label="GitHub"
      role="img"
      {...props}
    >
      <path
        d="M10 2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.3c-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.88-1.17-.88-1.17-.72-.49.05-.48.05-.48.8.06 1.22.82 1.22.82.71 1.22 1.86.87 2.31.66.07-.52.28-.87.5-1.07-1.77-.2-3.63-.89-3.63-3.95 0-.87.31-1.58.82-2.14-.08-.2-.36-1.01.08-2.1 0 0 .67-.21 2.2.82A7.64 7.64 0 0 1 10 6.84c.68 0 1.36.09 2 .26 1.52-1.03 2.19-.82 2.19-.82.44 1.09.16 1.9.08 2.1.51.56.82 1.27.82 2.14 0 3.07-1.87 3.75-3.65 3.95.29.25.54.74.54 1.49v2.2c0 .21.14.46.55.38A8 8 0 0 0 10 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SlackMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-label="Slack"
      role="img"
      {...props}
    >
      {/* Simple hash-grid mark */}
      <rect
        x="3"
        y="8"
        width="4"
        height="4"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
      />
      <rect
        x="9"
        y="3"
        width="4"
        height="4"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
      />
      <rect
        x="9"
        y="13"
        width="4"
        height="4"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
      />
      <rect
        x="14"
        y="8"
        width="4"
        height="4"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
      />
    </svg>
  );
}

export function GreenhouseMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-label="Greenhouse"
      role="img"
      {...props}
    >
      <path
        d="M10 3a7 7 0 1 1 0 14A7 7 0 0 1 10 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function AshbyMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-label="Ashby"
      role="img"
      {...props}
    >
      <polygon
        points="10,3 17,14 3,14"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
      <line
        x1="10"
        y1="8"
        x2="10"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NextJsMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-label="Next.js"
      role="img"
      {...props}
    >
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path
        d="M7.5 6.5v7l6-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function PostgresMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-label="Postgres"
      role="img"
      {...props}
    >
      <ellipse cx="10" cy="7" rx="6" ry="3" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path
        d="M4 7v6c0 1.66 2.69 3 6 3s6-1.34 6-3V7"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
      />
      <line
        x1="10"
        y1="10"
        x2="10"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BetterAuthMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-label="Better Auth"
      role="img"
      {...props}
    >
      <path
        d="M10 2L3.5 5.5v4.5c0 3.5 2.8 6.7 6.5 7.5 3.7-.8 6.5-4 6.5-7.5V5.5L10 2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
      />
      <path
        d="M7.5 10l1.5 1.5L13 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OpenAIMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-label="OpenAI"
      role="img"
      {...props}
    >
      <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <circle
        cx="10"
        cy="10"
        r="7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="2.5 2"
        fill="none"
      />
    </svg>
  );
}

export function AirbyteMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-label="Airbyte"
      role="img"
      {...props}
    >
      <path d="M5 4h10v2H5zM5 9h8v2H5zM5 14h6v2H5z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

export function GuildMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-label="Guild AI"
      role="img"
      {...props}
    >
      <path d="M10 3l7 4v6l-7 4-7-4V7l7-4Z" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <circle cx="10" cy="10" r="2" fill="currentColor" />
    </svg>
  );
}

export function TrueFoundryMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-label="TrueFoundry"
      role="img"
      {...props}
    >
      <path
        d="M3 8h14M3 12h10M7 5l-4 5.5 4 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function RenderMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-label="Render"
      role="img"
      {...props}
    >
      <rect
        x="3"
        y="3"
        width="14"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
      />
      <path
        d="M7 7h4a2 2 0 0 1 0 4H7v3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
