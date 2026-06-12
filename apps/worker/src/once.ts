/**
 * One-shot entrypoint for the Render `cron` service.
 *
 * The `worker` service runs {@link startWorkerLoop} continuously; a scheduled
 * Render Cron Job instead runs a single reconciliation pass and exits. Same
 * jobs, no long-lived process. See render.yaml.
 *
 * Usage: pnpm --filter @yougrep/worker start:once
 */
import { getEnv } from '@yougrep/config';
import { ensureMigrated } from '@yougrep/db';
import { runOnce } from './runtime';

async function main(): Promise<void> {
  const env = getEnv();
  await ensureMigrated();

  const summary = await runOnce();
  console.log(
    `[worker:cron] single pass complete · env=${env.NODE_ENV} · ` +
      `orgs=${summary.orgs} · examined=${summary.examined} · finalized=${summary.finalized}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('[worker:cron] fatal error', err);
  process.exit(1);
});
