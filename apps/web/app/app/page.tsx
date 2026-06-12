import { redirect } from 'next/navigation';
import { ChatCircleDots } from '@phosphor-icons/react/dist/ssr';
import { listJobChannels } from '@yougrep/domain';
import { currentSession } from '../../lib/session';
import styles from '../../components/workspace/workspace.module.css';

export default async function WorkspaceHome() {
  const session = await currentSession();
  if (!session) redirect('/sign-in');
  if (!session.organizationId) redirect('/onboarding');

  const channels = await listJobChannels(session.organizationId);
  if (channels[0]) redirect(`/app/c/${channels[0].id}`);

  return (
    <main className={`${styles.main} ${styles.mainNoAside}`}>
      <div className={styles.empty}>
        <span className={styles.emptyIcon} aria-hidden="true">
          <ChatCircleDots size={28} weight="duotone" />
        </span>
        <h1 className={styles.emptyTitle}>Create your first job channel</h1>
        <p className={styles.emptyText}>
          Every channel is one open role. Use the <strong>+</strong> next to “Job channels” to
          create one — the agent will read your connected context and draft the listing.
        </p>
      </div>
    </main>
  );
}
