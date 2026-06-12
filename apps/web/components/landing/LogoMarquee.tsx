import type React from 'react';
import s from './landing.module.css';
import {
  NotionMark,
  GitHubMark,
  SlackMark,
  GreenhouseMark,
  AshbyMark,
  NextJsMark,
  PostgresMark,
  BetterAuthMark,
  OpenAIMark,
  AirbyteMark,
  GuildMark,
  TrueFoundryMark,
  RenderMark,
} from './logos';

const chips: { Mark: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string }[] = [
  { Mark: NotionMark, label: 'Notion' },
  { Mark: GitHubMark, label: 'GitHub' },
  { Mark: SlackMark, label: 'Slack' },
  { Mark: GreenhouseMark, label: 'Greenhouse' },
  { Mark: AshbyMark, label: 'Ashby' },
  { Mark: NextJsMark, label: 'Next.js' },
  { Mark: PostgresMark, label: 'Postgres' },
  { Mark: BetterAuthMark, label: 'Better Auth' },
  { Mark: OpenAIMark, label: 'OpenAI' },
  { Mark: AirbyteMark, label: 'Airbyte' },
  { Mark: GuildMark, label: 'Guild AI' },
  { Mark: TrueFoundryMark, label: 'TrueFoundry' },
  { Mark: RenderMark, label: 'Render' },
];

function Chip({
  Mark,
  label,
}: {
  Mark: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}) {
  return (
    <div className={s.logoChip} aria-label={label}>
      <span className={s.logoChipMark}>
        <Mark color="currentColor" />
      </span>
      <span className={s.logoChipLabel}>{label}</span>
    </div>
  );
}

export default function LogoMarquee() {
  // Duplicate the list for seamless looping
  const doubled = [...chips, ...chips];

  return (
    <section className={s.marqueeSection} aria-label="Integrations and stack">
      <p className={s.marqueeLabel}>Connects with · powered by</p>
      <div className={s.marqueeTrack} aria-hidden="true">
        <div className={s.marqueeInner}>
          {doubled.map((chip, i) => (
            <Chip key={`${chip.label}-${i}`} {...chip} />
          ))}
        </div>
      </div>
    </section>
  );
}
