import { notFound, redirect } from 'next/navigation';
import { getJobChannel, listChannelMessages } from '@yougrep/domain';
import type { OpenUIDocument } from '@yougrep/openui';
import { currentSession } from '../../../../lib/session';
import { ChannelView, type ChannelMessageDTO } from '../../../../components/workspace/ChannelView';

export default async function ChannelPage({ params }: { params: Promise<{ channelId: string }> }) {
  const session = await currentSession();
  if (!session) redirect('/sign-in');
  if (!session.organizationId) redirect('/onboarding');

  const { channelId } = await params;
  const channel = await getJobChannel(session.organizationId, channelId);
  if (!channel) notFound();

  const messages = await listChannelMessages(session.organizationId, channelId);
  const dto: ChannelMessageDTO[] = messages.map((m) => ({
    id: m.id,
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
    openui: (m.openui as OpenUIDocument | null) ?? null,
  }));

  return (
    <ChannelView
      channelId={channel.id}
      channelName={channel.name}
      initialMessages={dto}
      userName={session.name}
    />
  );
}
