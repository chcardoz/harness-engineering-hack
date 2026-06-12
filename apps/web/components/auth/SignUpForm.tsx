'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUp } from '@yougrep/auth/client';
import s from './auth.module.css';

export default function SignUpForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);

    const { error: signUpError } = await signUp.email({ email, password, name });

    if (signUpError) {
      setError(signUpError.message ?? 'Could not create your account. Please try again.');
      setPending(false);
      return;
    }

    window.location.href = '/onboarding';
  }

  return (
    <form className={s.form} onSubmit={handleSubmit} noValidate>
      <div className={s.field}>
        <label className={s.label} htmlFor="signup-name">
          Name
        </label>
        <input
          id="signup-name"
          className={s.input}
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          required
          disabled={pending}
        />
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor="signup-email">
          Work email
        </label>
        <input
          id="signup-email"
          className={s.input}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'signup-error' : undefined}
          disabled={pending}
        />
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor="signup-password">
          Password
        </label>
        <input
          id="signup-password"
          className={s.input}
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          required
          minLength={8}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'signup-error' : undefined}
          disabled={pending}
        />
      </div>

      {error ? (
        <p className={s.error} id="signup-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className={s.submit} type="submit" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </button>

      <p className={s.footer}>
        Already have an account?{' '}
        <Link href="/sign-in" className={s.footerLink}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
