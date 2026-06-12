/**
 * @yougrep/logger — one tiny structured logger for every process.
 *
 * Why this exists: on Render we only get stdout/stderr. A bare `console.log`
 * scatters un-greppable strings; this emits one structured line per event with a
 * stable shape (`ts`, `level`, `scope`, `msg`, + fields) so we can actually
 * search and correlate when something breaks in prod.
 *
 * Zero dependencies and reads `process.env` directly (no `@yougrep/config`), so
 * it is safe to import from any package — including the lowest-level ones —
 * without creating a cycle.
 *
 * Output format:
 *   - production (Render): newline-delimited JSON, one object per line.
 *   - local dev: a compact, coloured, human line.
 * Override with `LOG_FORMAT=json|pretty`. Level via `LOG_LEVEL=debug|info|warn|error`.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  /** Derive a logger with a nested scope and/or extra always-on fields. */
  child(scope: string, fields?: LogFields): Logger;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function envLevel(): LogLevel {
  const raw = (process.env['LOG_LEVEL'] ?? '').toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') return raw;
  return process.env['NODE_ENV'] === 'production' ? 'info' : 'debug';
}

function isPretty(): boolean {
  const fmt = (process.env['LOG_FORMAT'] ?? '').toLowerCase();
  if (fmt === 'json') return false;
  if (fmt === 'pretty') return true;
  return process.env['NODE_ENV'] !== 'production';
}

/** Serialize an Error (or anything) into a plain, JSON-safe object. */
function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...(value.cause ? { cause: serialize(value.cause) } : {}),
    };
  }
  return value;
}

/** Normalize a fields bag: serialize Errors and drop undefined values. */
function normalizeFields(fields?: LogFields): LogFields {
  if (!fields) return {};
  const out: LogFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    out[k] = serialize(v);
  }
  return out;
}

const COLOR: Record<LogLevel, string> = {
  debug: '\x1b[90m', // grey
  info: '\x1b[36m', // cyan
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};
const RESET = '\x1b[0m';

function emit(level: LogLevel, scope: string, msg: string, fields: LogFields): void {
  const ts = new Date().toISOString();
  const stream = LEVEL_WEIGHT[level] >= LEVEL_WEIGHT.warn ? process.stderr : process.stdout;

  if (isPretty()) {
    const time = ts.slice(11, 23);
    const head = `${COLOR[level]}${level.toUpperCase().padEnd(5)}${RESET}`;
    const rest = Object.keys(fields).length ? ` ${JSON.stringify(fields)}` : '';
    stream.write(`${time} ${head} \x1b[1m[${scope}]\x1b[0m ${msg}${rest}\n`);
    return;
  }

  stream.write(`${JSON.stringify({ ts, level, scope, msg, ...fields })}\n`);
}

function build(scope: string, base: LogFields): Logger {
  const threshold = LEVEL_WEIGHT[envLevel()];
  const at = (level: LogLevel, msg: string, fields?: LogFields): void => {
    if (LEVEL_WEIGHT[level] < threshold) return;
    emit(level, scope, msg, { ...base, ...normalizeFields(fields) });
  };
  return {
    debug: (msg, fields) => at('debug', msg, fields),
    info: (msg, fields) => at('info', msg, fields),
    warn: (msg, fields) => at('warn', msg, fields),
    error: (msg, fields) => at('error', msg, fields),
    child: (childScope, fields) =>
      build(`${scope}:${childScope}`, { ...base, ...normalizeFields(fields) }),
  };
}

/** Create a scoped logger. `scope` shows up on every line (e.g. "web:api:composio"). */
export function createLogger(scope: string, base?: LogFields): Logger {
  return build(scope, normalizeFields(base));
}

/** The root logger; prefer a scoped child via {@link createLogger}. */
export const logger: Logger = createLogger('app');
