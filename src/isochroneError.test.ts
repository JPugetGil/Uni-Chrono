import { describe, expect, it } from 'vitest';
import { IsochroneError, errorKindOf, httpError, isRetryable } from './isochroneError';

const response = (status: number, headers: Record<string, string> = {}) => ({ status, headers: new Headers(headers) }) as Response;

describe('httpError', () => {
  it.each([
    [401, 'auth'],
    [403, 'auth'],
    [429, 'quota'],
    [422, 'failed'],
    [503, 'failed'],
  ] as const)('HTTP %i → %s', (status, kind) => {
    expect(httpError(response(status)).kind).toBe(kind);
  });

  it('lit le délai Retry-After en secondes', () => {
    expect(httpError(response(429, { 'Retry-After': '2' })).retryAfterMs).toBe(2000);
    expect(httpError(response(429, { 'Retry-After': 'demain' })).retryAfterMs).toBeUndefined();
  });
});

describe('isRetryable', () => {
  it('réessaie le réseau, le quota et les erreurs serveur, pas les requêtes refusées', () => {
    expect(isRetryable(new TypeError('Failed to fetch'))).toBe(true);
    expect(isRetryable(httpError(response(429)))).toBe(true);
    expect(isRetryable(httpError(response(502)))).toBe(true);
    expect(isRetryable(httpError(response(401)))).toBe(false);
    expect(isRetryable(httpError(response(422)))).toBe(false);
    expect(isRetryable(new IsochroneError('unconfigured', 'pas de clé'))).toBe(false);
  });
});

describe('errorKindOf', () => {
  it('classe toute autre erreur comme un échec', () => {
    expect(errorKindOf(new IsochroneError('quota', 'HTTP 429'))).toBe('quota');
    expect(errorKindOf(new Error('boom'))).toBe('failed');
  });
});
