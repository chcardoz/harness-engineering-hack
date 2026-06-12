import { NextResponse } from 'next/server';

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
  if (status >= 500) console.error('[api] error:', err);
  return NextResponse.json({ error: message }, { status });
}
