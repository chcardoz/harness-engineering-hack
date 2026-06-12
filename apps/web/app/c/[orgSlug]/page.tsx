import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ensureMigrated } from '@yougrep/db';
import { listPublishedPostingsByOrgSlug } from '@yougrep/domain';
import { rolePath } from '@yougrep/config';
import * as motion from 'motion/react-client';
import { Buildings, MapPin, ArrowRight, Briefcase } from '@phosphor-icons/react/dist/ssr';
import s from '../../../components/board/board.module.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;
  await ensureMigrated();
  const result = await listPublishedPostingsByOrgSlug(orgSlug);
  const label = result?.org.name ?? orgSlug;
  return {
    title: `Careers · ${label}`,
    description: `Open roles at ${label}, powered by Yougrep.`,
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

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await ensureMigrated();
  const result = await listPublishedPostingsByOrgSlug(orgSlug);

  if (!result) {
    notFound();
  }

  const { org, postings } = result;

  return (
    <div className={s.shell}>
      <Topbar companyName={org.name} />
      <main className={s.main}>
        {postings.length === 0 ? (
          <div className={s.empty}>
            <span className={s.emptyIcon}>
              <Briefcase size={26} weight="duotone" aria-hidden="true" />
            </span>
            <h1 className={s.emptyTitle}>No open roles right now</h1>
            <p className={s.emptyBody}>
              {org.name} isn&rsquo;t hiring at the moment. Check back soon — new roles appear here
              as they open.
            </p>
          </div>
        ) : (
          <>
            <motion.div
              className={s.listHeader}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <p className={s.eyebrow}>Careers</p>
              <h1 className={s.listTitle}>Open roles at {org.name}</h1>
              <p className={s.listSubhead}>
                {postings.length} open {postings.length === 1 ? 'role' : 'roles'}. One click starts
                a structured interview.
              </p>
            </motion.div>

            <ul className={s.cardList}>
              {postings.map((posting, i) => (
                <motion.li
                  key={posting.slug}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 + i * 0.05 }}
                >
                  <Link className={s.cardLink} href={rolePath(org.slug, posting.slug)}>
                    <article className={s.card}>
                      <div className={s.cardBody}>
                        <h2 className={s.cardTitle}>{posting.title}</h2>
                        {posting.location ? (
                          <span className={s.cardMeta}>
                            <span className={s.cardMetaIcon}>
                              <MapPin size={14} weight="fill" aria-hidden="true" />
                            </span>
                            {posting.location}
                          </span>
                        ) : null}
                        {posting.summary ? (
                          <p className={s.cardSummary}>{posting.summary}</p>
                        ) : null}
                      </div>
                      <span className={s.cardChevron} aria-hidden="true">
                        <ArrowRight size={20} weight="bold" />
                      </span>
                    </article>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
