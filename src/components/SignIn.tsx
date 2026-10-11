'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  next: string;
  heading?: string;
  intro?: string;
  expired?: boolean;
}

/** Email-link sign-in. In development without a mail provider the link is shown on the page. */
export function SignIn({ next, heading = 'Sign in', intro, expired }: Props) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');
  const [devLink, setDevLink] = useState<string | null>(null);

  const submit = async () => {
    setState('busy');
    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { devLink?: string };
      setDevLink(data.devLink ?? null);
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <section className="wrap page" style={{ maxWidth: 560 }}>
      <h1 className="h1-page" style={{ fontSize: 50, marginBottom: 16 }}>{heading}</h1>
      {expired && state === 'idle' && <p className="err">That link has expired or was already used. Ask for a new one.</p>}
      {state === 'sent' ? (
        <div className="fade-up" role="status">
          <p>We sent a sign-in link to <strong style={{ fontWeight: 600 }}>{email}</strong>. It works once, for fifteen minutes.</p>
          {devLink && (
            <p className="muted" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>
              Development: no mail provider is set, so here is the link. <a className="linkish" href={devLink}>Sign in now</a>
            </p>
          )}
          <p className="muted" style={{ fontSize: 13 }}>Nothing after a minute? Check spam, or ask again. One link goes out every 30 seconds.</p>
          <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setState('idle')}>Ask again</button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <p className="muted">{intro ?? 'Enter the email you ordered with. We send a one-time link, no password.'}</p>
          <div className="field" style={{ margin: '18px 0' }}>
            <label htmlFor="signin-email">Email</label>
            <input
              id="signin-email"
              className="input"
              type="email"
              required
              autoComplete="email"
              placeholder="you@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 22px' }} disabled={state === 'busy'}>
            {state === 'busy' ? 'Sending…' : 'Send the link'}
          </button>
          {state === 'error' && <p className="err" role="alert">Something went wrong. Try again in a moment.</p>}
        </form>
      )}
    </section>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-ghost"
      style={{ fontSize: 10.5, letterSpacing: '0.16em' }}
      onClick={async () => {
        await fetch('/api/auth/signout', { method: 'POST' });
        router.push('/');
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
