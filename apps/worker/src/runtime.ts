/**
 * The poll loop / scheduler.
 *
 * This is the "stub queue": no external broker. We poll Postgres directly on a
 * fixed interval, run the background jobs, log a structured heartbeat, and shut
 * down cleanly on SIGINT/SIGTERM. Kept separate from the jobs so the jobs stay
 * loop-free and unit-testable.
 */
import { reconcileInterviews } from './jobs/reconcile-interviews';
import { listAllOrganizationIds } from './orgs';

export interface WorkerLoopOptions {
  /** Interval between passes, in milliseconds. */
  intervalMs: number;
}

export interface WorkerLoopHandle {
  /** Resolves once the loop has fully stopped. */
  done: Promise<void>;
  /** Request a graceful stop (idempotent). */
  stop: () => void;
}

/** Run a single full pass of every background job once. Returns a summary. */
export async function runOnce(): Promise<{ orgs: number; finalized: number; examined: number }> {
  const organizationIds = await listAllOrganizationIds();
  if (organizationIds.length === 0) {
    return { orgs: 0, finalized: 0, examined: 0 };
  }

  const reconciled = await reconcileInterviews({ organizationIds });

  return {
    orgs: organizationIds.length,
    finalized: reconciled.finalized,
    examined: reconciled.examined,
  };
}

function heartbeat(pass: number, summary: Awaited<ReturnType<typeof runOnce>>): void {
  console.log(
    JSON.stringify({
      level: 'info',
      worker: 'reconcile',
      event: 'heartbeat',
      pass,
      orgs: summary.orgs,
      sessionsExamined: summary.examined,
      sessionsReconciled: summary.finalized,
      at: new Date().toISOString(),
    }),
  );
}

/**
 * Start the interval loop. Runs one pass immediately, then every `intervalMs`.
 * Passes never overlap: the next pass is scheduled only after the current one
 * settles. Returns a handle to await/stop the loop.
 */
export function startWorkerLoop(options: WorkerLoopOptions): WorkerLoopHandle {
  let stopped = false;
  let pass = 0;
  let resolveDone: () => void;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  let timer: NodeJS.Timeout | null = null;

  async function tick(): Promise<void> {
    if (stopped) return;
    pass += 1;
    try {
      const summary = await runOnce();
      heartbeat(pass, summary);
    } catch (err) {
      console.error(
        JSON.stringify({
          level: 'error',
          worker: 'reconcile',
          event: 'pass_failed',
          pass,
          at: new Date().toISOString(),
        }),
        err,
      );
    }

    if (stopped) {
      resolveDone();
      return;
    }
    timer = setTimeout(() => void tick(), options.intervalMs);
  }

  function stop(): void {
    if (stopped) return;
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
      // No pass in flight; resolve now.
      resolveDone();
    }
    // If a pass is in flight, tick() resolves done() when it settles.
  }

  // Kick off the first pass immediately.
  void tick();

  return { done, stop };
}
