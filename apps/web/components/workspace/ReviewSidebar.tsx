'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowsClockwise, UsersThree } from '@phosphor-icons/react';
import styles from './workspace.module.css';

interface Scorecard {
  candidateId: string;
  name: string;
  overallScore: number | null;
  recommendation: string | null;
  summary: string | null;
  strengths: string[];
  concerns: string[];
  rubricScores: { key: string; label: string; score: number }[];
}

interface ReviewData {
  pipeline: { stage: string; count: number }[];
  scorecards: Scorecard[];
  applicationCount: number;
}

function recClass(rec: string | null): string {
  if (!rec) return '';
  const r = rec.toLowerCase();
  if (r.includes('strong yes') || r === 'yes') return styles.recYes ?? '';
  if (r.includes('maybe')) return styles.recMaybe ?? '';
  return styles.recNo ?? '';
}

export function ReviewSidebar({
  channelId,
  refreshSignal,
}: {
  channelId: string;
  refreshSignal: number;
}) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/review`, { cache: 'no-store' });
      if (res.ok) setData((await res.json()) as ReviewData);
    } catch {
      /* keep last data */
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    void load();
  }, [load, refreshSignal]);

  const maxCount = Math.max(1, ...(data?.pipeline.map((p) => p.count) ?? [1]));

  return (
    <aside className={styles.aside}>
      <div className={styles.asideHead}>
        <span className={styles.asideTitle}>Candidates</span>
        <button
          type="button"
          className={styles.refresh}
          aria-label="Refresh candidates"
          onClick={() => void load()}
        >
          <ArrowsClockwise size={15} className={loading ? 'spin' : ''} aria-hidden="true" />
        </button>
      </div>

      {data && data.applicationCount > 0 && (
        <div className={styles.pipeline}>
          {data.pipeline
            .filter((p) => p.count > 0 || p.stage === 'applied')
            .map((p) => (
              <div key={p.stage} className={styles.pipeRow}>
                <span style={{ textTransform: 'capitalize', minWidth: 78 }}>{p.stage}</span>
                <span className={styles.pipeBarTrack}>
                  <span
                    className={styles.pipeBar}
                    style={{ width: `${(p.count / maxCount) * 100}%` }}
                  />
                </span>
                <span className={styles.pipeCount}>{p.count}</span>
              </div>
            ))}
        </div>
      )}

      {!data || data.scorecards.length === 0 ? (
        <div className={styles.emptyAside}>
          <UsersThree
            size={26}
            weight="duotone"
            color="var(--muted-2)"
            style={{ marginBottom: 8 }}
            aria-hidden="true"
          />
          <p style={{ margin: 0 }}>
            {data && data.applicationCount > 0
              ? 'Candidates have applied — scorecards appear here once they finish the interview.'
              : 'No candidates yet. Publish the role and share your job board to start interviews.'}
          </p>
        </div>
      ) : (
        data.scorecards.map((c) => (
          <article key={c.candidateId} className={styles.scoreCard}>
            <div className={styles.scoreTop}>
              <span className={styles.scoreName}>{c.name}</span>
              {typeof c.overallScore === 'number' && (
                <span className={styles.scorePill}>{c.overallScore}</span>
              )}
            </div>
            {c.recommendation && (
              <div className={`${styles.rec} ${recClass(c.recommendation)}`}>
                {c.recommendation}
              </div>
            )}
            {c.summary && <p className={styles.scoreSummary}>{c.summary}</p>}
            {(c.strengths.length > 0 || c.concerns.length > 0) && (
              <div className={styles.tagRow}>
                {c.strengths.slice(0, 3).map((s, i) => (
                  <span key={`s-${i}`} className={`${styles.tag} ${styles.tagGood}`}>
                    {s}
                  </span>
                ))}
                {c.concerns.slice(0, 2).map((s, i) => (
                  <span key={`c-${i}`} className={styles.tag}>
                    {s}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))
      )}
    </aside>
  );
}
