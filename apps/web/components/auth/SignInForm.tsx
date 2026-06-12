'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from '@yougrep/auth/client';
import s from './auth.module.css';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);

    const { error: signInError } = await signIn.email({ email, password });

    if (signInError) {
      setError(signInError.message ?? 'Could not sign you in. Please check your details.');
      setPending(false);
      return;
    }

    window.location.href = '/app';
  }

  return (
    <form className={s.form} onSubmit={handleSubmit} noValidate>
      <div className={s.field}>
        <label className={s.label} htmlFor="signin-email">
          Email
        </label>
        <input
          id="signin-email"
          className={s.input}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'signin-error' : undefined}
          disabled={pending}
        />
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor="signin-password">
          Password
        </label>
        <input
          id="signin-password"
          className={s.input}
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'signin-error' : undefined}
          disabled={pending}
        />
      </div>

      {error ? (
        <p className={s.error} id="signin-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className={s.submit} type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>

      <p className={s.footer}>
        New here?{' '}
        <Link href="/sign-up" className={s.footerLink}>
          Create an account
        </Link>
      </p>
    </form>
  );
}
