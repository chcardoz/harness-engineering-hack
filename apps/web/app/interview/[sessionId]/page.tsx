import { notFound } from 'next/navigation';
import { ensureMigrated } from '@yougrep/db';
import {
  getInterviewSessionByCapability,
  getJobChannel,
  getOrganizationById,
} from '@yougrep/domain';
import { InterviewRunner } from '../../../components/interview/InterviewRunner';
import styles from '../../../components/interview/interview.module.css';

export const metadata = { title: 'Interview · Yougrep' };

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await ensureMigrated();
  const { sessionId } = await params;

  const session = await getInterviewSessionByCapability(sessionId);
  if (!session) notFound();

  const [channel, org] = await Promise.all([
    getJobChannel(session.organizationId, session.jobChannelId),
    getOrganizationById(session.organizationId),
  ]);

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.topbarInner}>
          <span className={styles.brand}>
            You<span className={styles.grep}>grep</span>
          </span>
          <div className={styles.roleMeta}>
            <div className={styles.roleName}>{channel?.name ?? 'Interview'}</div>
            {org?.name && <div className={styles.orgName}>{org.name}</div>}
          </div>
        </div>
      </div>

      <div
        className={styles.intro}
        style={{ maxWidth: 680, margin: '32px auto 0', padding: '0 20px' }}
      >
        <h1 className={styles.introTitle}>Your interview for {channel?.name ?? 'this role'}</h1>
        <p className={styles.introText}>
          A structured conversation with a few short exercises. Take your time — your answers go
          straight to the hiring team.
        </p>
      </div>

      <InterviewRunner sessionId={sessionId} />

      <footer className={styles.footer}>
        Powered by Yougrep · responses recorded for evaluation
      </footer>
    </div>
  );
}
