import { NextResponse } from 'next/server';
import { createLogger } from '@yougrep/logger';

const log = createLogger('web:api');

/** Narrow shape for errors that carry an HTTP status (e.g. Unauthorized/Forbidden). */
function statusOf(err: unknown): number {
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status: unknown }).status;
    if (typeof s === 'number') return s;
  }
  return 500;
}

export function json<T>(data: T, init?: number | ResponseInit): NextResponse {
  return NextResponse.json(data, typeof init === 'number' ? { status: init } : init);
}

export function errorResponse(err: unknown): NextResponse {
  const status = statusOf(err);
  const message = err instanceof Error ? err.message : 'Unexpected error';
  // 5xx are our bugs — log with the stack; 4xx are expected client errors.
  if (status >= 500) log.error('request failed', { status, err });
  else log.warn('request rejected', { status, message });
  return NextResponse.json({ error: message }, { status });
}
