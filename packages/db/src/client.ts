import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import {
  drizzle as drizzleNodePg,
  type NodePgDatabase,
} from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getEnv } from '@yougrep/config';
import { createLogger } from '@yougrep/logger';
import { schema } from './schema';
import { INIT_SQL } from './migrations.generated';

const log = createLogger('db');

/**
 * Two backends behind one type:
 *  - Local dev / tests: PGlite (in-process Postgres, file-backed).
 *  - Production: a managed Postgres reached via DATABASE_URL.
 * Both are real Postgres, so the schema and every drizzle query are identical;
 * only the driver differs. DATABASE_URL presence is the switch.
 */
export type Database =
  | PgliteDatabase<typeof schema>
  | NodePgDatabase<typeof schema>;

type DbGlobal = {
  __yougrep_pglite?: PGlite;
  __yougrep_pgpool?: Pool;
  __yougrep_db?: Database;
  __yougrep_migrated?: Promise<void>;
};
const g = globalThis as unknown as DbGlobal;

/** True when a managed Postgres is configured (production path). */
function useManagedPg(): boolean {
  const url = getEnv().DATABASE_URL;
  return typeof url === 'string' && url.length > 0;
}

/**
 * SSL config for managed Postgres. Most managed providers require TLS but
 * present a cert chain node-postgres won't verify by default, so we relax
 * verification unless the URL is plainly local or explicitly disables SSL.
 */
function pgSsl(url: string): false | { rejectUnauthorized: boolean } {
  if (/sslmode=disable/.test(url)) return false;
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(url)) return false;
  return { rejectUnauthorized: false };
}

function getPglite(): PGlite {
  if (!g.__yougrep_pglite) {
    const env = getEnv();
    // PGlite's own mkdir is non-recursive; make sure the dir tree exists.
    mkdirSync(env.PGLITE_DATA_DIR, { recursive: true });
    g.__yougrep_pglite = new PGlite(env.PGLITE_DATA_DIR);
  }
  return g.__yougrep_pglite;
}

function getPool(): Pool {
  if (!g.__yougrep_pgpool) {
    const url = getEnv().DATABASE_URL as string;
    const pool = new Pool({
      connectionString: url,
      ssl: pgSsl(url),
    });
    // Host (not the full URL — it carries the password) so prod logs show which
    // database we actually connected to.
    let host = 'unknown';
    try {
      host = new URL(url).host;
    } catch {
      /* keep 'unknown' */
    }
    log.info('managed postgres pool created', { host, ssl: pgSsl(url) !== false });
    pool.on('error', (err) => log.error('postgres pool error', { host, err }));
    g.__yougrep_pgpool = pool;
  }
  return g.__yougrep_pgpool;
}

export function getDb(): Database {
  if (!g.__yougrep_db) {
    g.__yougrep_db = useManagedPg()
      ? drizzleNodePg(getPool(), { schema })
      : drizzlePglite(getPglite(), { schema });
  }
  return g.__yougrep_db;
}

/**
 * Apply the embedded schema DDL exactly once per process, guarded so it is a
 * no-op when the schema already exists. Embedding the SQL (vs. the file-based
 * drizzle migrator) keeps this working under Next's server bundling, where
 * filesystem path resolution into the package is unreliable. Idempotent on
 * both backends, so it is safe to call on every boot (including managed PG).
 */
export function ensureMigrated(): Promise<void> {
  if (!g.__yougrep_migrated) {
    g.__yougrep_migrated = (async () => {
      const backend = useManagedPg() ? 'managed-pg' : 'pglite';
      const probe = "select to_regclass('public.organization') as t";
      try {
        if (useManagedPg()) {
          const pool = getPool();
          const res = await pool.query<{ t: string | null }>(probe);
          if (res.rows[0]?.t == null) {
            log.info('applying schema', { backend });
            await pool.query(INIT_SQL);
          }
        } else {
          const client = getPglite();
          const res = await client.query<{ t: string | null }>(probe);
          if (res.rows[0]?.t == null) {
            log.info('applying schema', { backend });
            await client.exec(INIT_SQL);
          }
        }
        log.info('database ready', { backend });
      } catch (err) {
        log.error('migration failed', { backend, err });
        throw err;
      }
    })();
  }
  return g.__yougrep_migrated;
}

/**
 * Raw PGlite handle for local-only scripts/tests. Not available on the managed
 * Postgres path — callers there should use getDb() or the pool directly.
 */
export function getRawClient(): PGlite {
  if (useManagedPg()) {
    throw new Error(
      'getRawClient() is PGlite-only; DATABASE_URL is set (managed Postgres). Use getDb() instead.',
    );
  }
  return getPglite();
}
