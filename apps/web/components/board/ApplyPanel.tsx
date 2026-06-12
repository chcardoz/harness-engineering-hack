'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import s from './board.module.css';

interface ApplyPanelProps {
  orgSlug: string;
  jobSlug: string;
  roleTitle: string;
}

export default function ApplyPanel({ orgSlug, jobSlug, roleTitle }: ApplyPanelProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }

    setPending(true);
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgSlug,
          jobSlug,
          email: trimmedEmail,
          name: name.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { sessionId?: string };
        if (data.sessionId) {
          window.location.href = '/interview/' + data.sessionId;
          return;
        }
        setError('Something went wrong starting your interview. Please try again.');
        setPending(false);
        return;
      }

      let message = 'Unable to start the interview. Please try again.';
      try {
        const data = (await res.json()) as { error?: string };
        if (data.error) message = data.error;
      } catch {
        /* non-JSON error body — keep fallback */
      }
      setError(message);
      setPending(false);
    } catch {
      setError('Network error. Check your connection and try again.');
      setPending(false);
    }
  }

  const hasError = error !== null;

  return (
    <div className={s.applyCard}>
      <h2 className={s.applyHeading}>Interview for this role</h2>
      <p className={s.applyRole}>{roleTitle}</p>

      <form className={s.applyForm} onSubmit={handleSubmit} noValidate>
        <div className={s.field}>
          <label className={s.label} htmlFor="apply-email">
            Email
          </label>
          <input
            id="apply-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            className={`${s.input} ${hasError ? s.inputError : ''}`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={hasError}
            aria-describedby={hasError ? 'apply-error' : undefined}
            disabled={pending}
          />
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="apply-name">
            Name <span style={{ color: 'var(--muted-2)', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="apply-name"
            type="text"
            name="name"
            autoComplete="name"
            className={s.input}
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
          />
        </div>

        {hasError ? (
          <p id="apply-error" className={s.errorMsg} role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className={s.submitBtn} disabled={pending}>
          {pending ? (
            <>
              <span className={s.spinner} aria-hidden="true" />
              Starting…
            </>
          ) : (
            <>
              Start voice + text interview
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <p className={s.reassure}>One click starts a structured interview. ~10 minutes.</p>
    </div>
  );
}
