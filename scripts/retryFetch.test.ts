import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithRetry } from './retryFetch';

describe('fetchWithRetry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries transient server errors', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 504 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    await expect(fetchWithRetry('https://example.test')).resolves.toMatchObject({ status: 200 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry client errors', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

    await expect(fetchWithRetry('https://example.test')).resolves.toMatchObject({ status: 404 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
