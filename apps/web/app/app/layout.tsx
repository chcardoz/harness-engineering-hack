import { redirect } from 'next/navigation';
import { listJobChannels, getOrganizationById } from '@yougrep/domain';
import { currentSession } from '../../lib/session';
import { Sidebar } from '../../components/workspace/Sidebar';
import styles from '../../components/workspace/workspace.module.css';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (!session) redirect('/sign-in');
  if (!session.organizationId) redirect('/onboarding');

  const [channels, org] = await Promise.all([
    listJobChannels(session.organizationId),
    getOrganizationById(session.organizationId),
  ]);

  return (
    <div className={styles.shell}>
      <Sidebar
        channels={channels.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
        orgName={org?.name ?? 'Your company'}
        orgSlug={org?.slug ?? ''}
        userName={session.name}
        userEmail={session.email}
      />
      {children}
    </div>
  );
}
