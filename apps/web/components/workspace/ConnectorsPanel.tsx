'use client';

import { useCallback, useEffect, useState } from 'react';
import { GithubLogo, NotionLogo, CheckCircle, Plugs, CircleNotch } from '@phosphor-icons/react';
import styles from './workspace.module.css';

type Toolkit = 'github' | 'notion' | 'linear';

interface ConnectorRow {
  toolkit: Toolkit;
  connected: boolean;
  status: string;
}

const META: Record<Toolkit, { label: string; Icon: typeof GithubLogo }> = {
  github: { label: 'GitHub', Icon: GithubLogo },
  notion: { label: 'Notion', Icon: NotionLogo },
  linear: { label: 'Linear', Icon: Plugs },
};

const ORDER: Toolkit[] = ['github', 'notion', 'linear'];

/**
 * Sidebar panel listing the org's context connectors. Each row is a one-click
 * OAuth: POST /api/composio/initiate → follow the returned Composio redirect.
 * On return, Composio bounces to /api/composio/callback which reconciles status,
 * and this panel re-fetches on mount.
 */
export function ConnectorsPanel() {
  const [rows, setRows] = useState<ConnectorRow[] | null>(null);
  const [pending, setPending] = useState<Toolkit | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/composio/connections');
      if (!res.ok) {
        setRows([]);
        return;
      }
      const data = (await res.json()) as { toolkits?: ConnectorRow[] };
      setRows(data.toolkits ?? []);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function connect(toolkit: Toolkit) {
    if (pending) return;
    setPending(toolkit);
    setError(null);
    try {
      const res = await fetch('/api/composio/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolkit }),
      });
      const data = (await res.json()) as { redirectUrl?: string; error?: string };
      if (!res.ok || !data.redirectUrl) {
        setError(data.error ?? 'Could not start connection');
        setPending(null);
        return;
      }
      // Hand the browser to Composio's hosted OAuth.
      window.location.href = data.redirectUrl;
    } catch {
      setError('Network error');
      setPending(null);
    }
  }

  const byToolkit = new Map((rows ?? []).map((r) => [r.toolkit, r]));

  return (
    <div className={styles.connectors}>
      <div className={styles.sectionLabel}>
        <span>Connectors</span>
      </div>
      <ul className={styles.connectorList}>
        {ORDER.map((toolkit) => {
          const { label, Icon } = META[toolkit];
          const row = byToolkit.get(toolkit);
          const connected = row?.connected ?? false;
          const isPending = pending === toolkit;
          return (
            <li key={toolkit} className={styles.connectorRow}>
              <Icon size={16} weight="duotone" className={styles.connectorIcon} aria-hidden="true" />
              <span className={styles.connectorName}>{label}</span>
              {connected ? (
                <span className={styles.connectorBadge} title="Connected">
                  <CheckCircle size={14} weight="fill" aria-hidden="true" /> Connected
                </span>
              ) : (
                <button
                  type="button"
                  className={styles.connectorBtn}
                  onClick={() => connect(toolkit)}
                  disabled={isPending || rows === null}
                  aria-label={`Connect ${label}`}
                >
                  {isPending ? (
                    <CircleNotch size={13} className={styles.spin} aria-hidden="true" />
                  ) : (
                    'Connect'
                  )}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <span role="alert" className={styles.connectorError}>
          {error}
        </span>
      )}
    </div>
  );
}
