'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Hash, Plus, SignOut, ArrowUpRight } from '@phosphor-icons/react';
import { signOut } from '@yougrep/auth/client';
import { ConnectorsPanel } from './ConnectorsPanel';
import styles from './workspace.module.css';

export interface SidebarChannel {
  id: string;
  name: string;
  slug: string;
}

export function Sidebar({
  channels,
  orgName,
  orgSlug,
  userName,
  userEmail,
}: {
  channels: SidebarChannel[];
  orgName: string;
  orgSlug: string;
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeId = pathname?.startsWith('/app/c/') ? pathname.split('/')[3] : null;

  async function createChannel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json()) as { channel?: { id: string }; error?: string };
      if (!res.ok || !data.channel) {
        setError(data.error ?? 'Could not create channel');
        return;
      }
      setName('');
      setCreating(false);
      router.push(`/app/c/${data.channel.id}`);
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setPending(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    window.location.href = '/';
  }

  const orgInitial = (orgName[0] ?? 'Y').toUpperCase();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHead}>
        <Link href="/app" className={styles.wordmark}>
          You<span className={styles.grep}>grep</span>
        </Link>
      </div>

      <div className={styles.orgChip}>
        <span className={styles.orgAvatar} aria-hidden="true">
          {orgInitial}
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {orgName}
        </span>
      </div>

      <ConnectorsPanel />

      <div className={styles.sectionLabel}>
        <span>Job channels</span>
        <button
          type="button"
          className={styles.addBtn}
          aria-label="Create job channel"
          onClick={() => setCreating((v) => !v)}
        >
          <Plus size={15} weight="bold" aria-hidden="true" />
        </button>
      </div>

      {creating && (
        <form className={styles.createForm} onSubmit={createChannel}>
          <input
            className={styles.createInput}
            placeholder="e.g. Senior Postgres Engineer"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            aria-label="New channel name"
          />
          {error && (
            <span role="alert" style={{ fontSize: 12, color: 'var(--danger)' }}>
              {error}
            </span>
          )}
          <div className={styles.createRow}>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={pending || !name.trim()}
            >
              {pending ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() => {
                setCreating(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className={styles.channelList}>
        {channels.length === 0 && !creating && (
          <li style={{ padding: '8px 10px', fontSize: 13, color: 'var(--muted-2)' }}>
            No channels yet. Create one to start.
          </li>
        )}
        {channels.map((c) => (
          <li key={c.id}>
            <Link
              href={`/app/c/${c.id}`}
              className={`${styles.channelItem} ${
                activeId === c.id ? styles.channelItemActive : ''
              }`}
            >
              <Hash size={15} className={styles.hash} weight="bold" aria-hidden="true" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {orgSlug && (
        <Link
          href={`/c/${orgSlug}`}
          target="_blank"
          className={styles.channelItem}
          style={{ margin: '0 10px 6px' }}
        >
          <ArrowUpRight size={15} className={styles.hash} weight="bold" aria-hidden="true" />
          <span>View public board</span>
        </Link>
      )}

      <div className={styles.sidebarFoot}>
        <div className={styles.userMeta} title={userEmail}>
          {userName}
        </div>
        <button type="button" className={styles.signOut} onClick={handleSignOut}>
          <SignOut size={14} aria-hidden="true" /> Sign out
        </button>
      </div>
    </aside>
  );
}
