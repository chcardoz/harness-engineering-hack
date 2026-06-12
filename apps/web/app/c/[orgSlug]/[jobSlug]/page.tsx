import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ensureMigrated } from '@yougrep/db';
import { getPublishedPosting } from '@yougrep/domain';
import { boardPath } from '@yougrep/config';
import * as motion from 'motion/react-client';
import { Buildings, MapPin, Briefcase, ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import ApplyPanel from '../../../../components/board/ApplyPanel';
import s from '../../../../components/board/board.module.css';

/** Narrow a loosely-typed contentSnapshot into the fields the board renders. */
function readSnapshot(snapshot: unknown) {
  const obj: Record<string, unknown> =
    snapshot && typeof snapshot === 'object' ? (snapshot as Record<string, unknown>) : {};

  const asStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

  const asString = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

  return {
    summary: asString(obj.summary),
    responsibilities: asStringArray(obj.responsibilities),
    requirements: asStringArray(obj.requirements),
    niceToHaves: asStringArray(obj.niceToHaves),
    employmentType: asString(obj.employmentType),
    location: asString(obj.location),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug, jobSlug } = await params;
  await ensureMigrated();
  const result = await getPublishedPosting(orgSlug, jobSlug);
  if (!result) {
    return { title: 'Role not found · Yougrep' };
  }
  return {
    title: `${result.posting.title} · ${result.org.name}`,
    description:
      result.posting.summary ?? `Apply to ${result.posting.title} at ${result.org.name}.`,
  };
}

function Topbar({ companyName }: { companyName: string }) {
  return (
    <header className={s.topbar}>
      <div className={s.topbarInner}>
        <span className={s.topbarCompany}>
          <span className={s.topbarCompanyIcon}>
            <Buildings size={18} weight="fill" aria-hidden="true" />
          </span>
          <span className={s.topbarCompanyName}>{companyName}</span>
        </span>
        <Link href="/" className={s.poweredBy} aria-label="Powered by Yougrep — go to homepage">
          Powered by{' '}
          <span className={s.poweredByWordmark}>
            You<span className={s.poweredByAccent}>grep</span>
          </span>
        </Link>
      </div>
    </header>
  );
}

function Section({ heading, items }: { heading: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className={s.section}>
      <h2 className={s.sectionHeading}>{heading}</h2>
      <ul className={s.bulletList}>
        {items.map((item, i) => (
          <li key={i} className={s.bullet}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}) {
  const { orgSlug, jobSlug } = await params;
  await ensureMigrated();
  const result = await getPublishedPosting(orgSlug, jobSlug);

  if (!result) {
    notFound();
  }

  const { org, posting } = result;
  const snap = readSnapshot(posting.contentSnapshot);

  const location = posting.location ?? snap.location;
  const summary = posting.summary ?? snap.summary;

  return (
    <div className={s.shell}>
      <Topbar companyName={org.name} />
      <main className={s.main}>
        <Link className={s.backLink} href={boardPath(orgSlug)}>
          <ArrowLeft size={15} weight="bold" aria-hidden="true" />
          All roles at {org.name}
        </Link>

        <motion.div
          className={s.detailLayout}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <article className={s.detailMain}>
            <h1 className={s.detailTitle}>{posting.title}</h1>

            {location || snap.employmentType ? (
              <div className={s.pillRow}>
                {location ? (
                  <span className={s.pill}>
                    <span className={s.pillIcon}>
                      <MapPin size={14} weight="fill" aria-hidden="true" />
                    </span>
                    {location}
                  </span>
                ) : null}
                {snap.employmentType ? (
                  <span className={s.pill}>
                    <span className={s.pillIcon}>
                      <Briefcase size={14} weight="fill" aria-hidden="true" />
                    </span>
                    {snap.employmentType}
                  </span>
                ) : null}
              </div>
            ) : null}

            {summary ? (
              <section className={s.section}>
                <h2 className={s.sectionHeading}>Summary</h2>
                <p className={s.lead}>{summary}</p>
              </section>
            ) : null}

            <Section heading="Responsibilities" items={snap.responsibilities} />
            <Section heading="Requirements" items={snap.requirements} />
            <Section heading="Nice to haves" items={snap.niceToHaves} />
          </article>

          <aside className={s.applyAside}>
            <ApplyPanel orgSlug={orgSlug} jobSlug={jobSlug} roleTitle={posting.title} />
          </aside>
        </motion.div>
      </main>
    </div>
  );
}
