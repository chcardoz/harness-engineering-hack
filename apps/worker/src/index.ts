/**
 * @yougrep/worker — the background reconciliation tier.
 *
 * Demonstrates the Render `worker` process from the blueprint as a simple,
 * real, in-process polling loop (a "stub queue": no external broker — we poll
 * Postgres directly). Today it runs one job: the interview finalize-backstop,
 * which finalizes result packages for `completed` sessions the inline path
 * missed. See ./jobs/reconcile-interviews.ts.
 *
 * Usage:
 *   pnpm --filter @yougrep/worker dev    # tsx watch
 *   pnpm --filter @yougrep/worker start  # tsx
 */
import { getEnv } from '@yougrep/config';
import { ensureMigrated } from '@yougrep/db';
import { startWorkerLoop } from './runtime';

const DEFAULT_INTERVAL_MS = 15_000;

function resolveIntervalMs(): number {
  const raw = process.env['WORKER_INTERVAL_MS'];
  if (!raw) return DEFAULT_INTERVAL_MS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_INTERVAL_MS;
  return parsed;
}

async function main(): Promise<void> {
  const env = getEnv();
  await ensureMigrated();

  const intervalMs = resolveIntervalMs();

  console.log(
    `[worker] @yougrep/worker started · env=${env.NODE_ENV} · ` +
      `integrations=${env.INTEGRATIONS_MODE} · interval=${intervalMs}ms · ` +
      `jobs=[reconcile-interviews]`,
  );

  const loop = startWorkerLoop({ intervalMs });

  const shutdown = (signal: string) => {
    console.log(`[worker] received ${signal}, draining current pass and shutting down…`);
    loop.stop();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await loop.done;
  console.log('[worker] stopped cleanly. Goodbye.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[worker] fatal error', err);
  process.exit(1);
});
