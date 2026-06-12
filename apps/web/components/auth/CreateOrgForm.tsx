'use client';

import { useMemo, useState } from 'react';
import { organizationActions } from '@yougrep/auth/client';
import s from './auth.module.css';

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || 'company';
}

export default function CreateOrgForm() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const slug = useMemo(() => slugify(name), [name]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);

    let result = await organizationActions.create({ name, slug });

    // Slug collision: retry once with a short random suffix.
    if (result.error) {
      const retrySlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`.slice(0, 64);
      result = await organizationActions.create({ name, slug: retrySlug });
    }

    if (result.error) {
      setError(result.error.message ?? 'Could not create your company. Please try again.');
      setPending(false);
      return;
    }

    const orgId = result.data?.id;
    if (!orgId) {
      setError('Your company was created but we could not activate it. Please refresh.');
      setPending(false);
      return;
    }

    await organizationActions.setActive({ organizationId: orgId });
    window.location.href = '/app';
  }

  return (
    <form className={s.form} onSubmit={handleSubmit} noValidate>
      <div className={s.field}>
        <label className={s.label} htmlFor="org-name">
          Company name
        </label>
        <input
          id="org-name"
          className={s.input}
          type="text"
          name="name"
          autoComplete="organization"
          placeholder="Acme Inc."
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby="org-slug-helper"
          disabled={pending}
        />
        <p className={s.helper} id="org-slug-helper">
          Your job board: <span className={s.helperMono}>yougrep.com/c/{slug}</span>
        </p>
      </div>

      {error ? (
        <p className={s.error} id="org-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className={s.submit} type="submit" disabled={pending}>
        {pending ? 'Creating company…' : 'Create company'}
      </button>
    </form>
  );
}
