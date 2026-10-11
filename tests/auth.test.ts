import { afterEach, describe, expect, it } from 'vitest';
import { decodeSession, encodeSession, roleFor, safeNext } from '@/server/auth';

describe('session cookie', () => {
  afterEach(() => {
    delete process.env.ATELIER_EMAILS;
  });

  it('round-trips and lowercases the email', () => {
    expect(decodeSession(encodeSession('Iris@Studio.nl'))).toEqual({ email: 'iris@studio.nl', role: 'customer' });
  });

  it('rejects a tampered body', () => {
    const [body, mac] = encodeSession('iris@studio.nl').split('.');
    const forged = Buffer.from(JSON.stringify({ e: 'atelier@marzae.test', x: Date.now() + 1e9 })).toString('base64url');
    expect(decodeSession(`${forged}.${mac}`)).toBeNull();
    expect(decodeSession(`${body}.x${mac.slice(1)}`)).toBeNull();
    expect(decodeSession('garbage')).toBeNull();
  });

  it('expires after fourteen days', () => {
    const issued = Date.now() - 15 * 86_400_000;
    expect(decodeSession(encodeSession('iris@studio.nl', issued))).toBeNull();
  });

  it('reads the role from ATELIER_EMAILS at decode time', () => {
    const cookie = encodeSession('bench@marzae.com');
    expect(decodeSession(cookie)?.role).toBe('customer');
    process.env.ATELIER_EMAILS = 'someone@else.com, Bench@Marzae.com';
    expect(roleFor('bench@marzae.com')).toBe('atelier');
    expect(decodeSession(cookie)?.role).toBe('atelier');
  });
});

describe('safeNext', () => {
  it.each([
    ['/atelier', '/atelier'],
    ['/orders?x=1', '/orders?x=1'],
    ['//evil.com', '/orders'],
    ['/\\evil.com', '/orders'],
    ['https://evil.com', '/orders'],
    [undefined, '/orders'],
  ])('%s → %s', (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});
