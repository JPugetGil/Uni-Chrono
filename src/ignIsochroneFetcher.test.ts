import { afterEach, describe, expect, it, vi } from 'vitest';

const response = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  ({ ok: status < 400, status, headers: new Headers(headers), json: () => Promise.resolve(body) }) as Response;

const polygon = { geometry: { type: 'Polygon', coordinates: [[[4.88, 45.78], [4.89, 45.78], [4.88, 45.79]]] } };

/** Module neuf : la cadence des requêtes est propre au module */
const load = async () => {
  vi.resetModules();
  return import('./ignIsochroneFetcher');
};

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchIgnIsochrone', () => {
  it('demande chaque durée, au plus 4 requêtes par seconde, et renvoie les bandes triées', async () => {
    vi.useFakeTimers();
    const sent: number[] = [];
    const fetch = vi.fn().mockImplementation(() => {
      sent.push(Date.now());
      return Promise.resolve(response(200, polygon));
    });
    vi.stubGlobal('fetch', fetch);
    const { fetchIgnIsochrone } = await load();

    const pending = fetchIgnIsochrone(45.78, 4.88, [15, 5, 10], 'driving');
    await vi.advanceTimersByTimeAsync(1000);
    const bands = await pending;

    expect(fetch.mock.calls.map(([url]) => Object.fromEntries(new URL(url).searchParams))).toEqual(
      [300, 600, 900].map((seconds) => ({
        resource: 'bdtopo-valhalla',
        point: '4.88,45.78',
        costValue: String(seconds),
        costType: 'time',
        profile: 'car',
        direction: 'departure',
        geometryFormat: 'geojson',
      }))
    );
    expect(sent[1] - sent[0]).toBeGreaterThanOrEqual(250);
    expect(sent[2] - sent[1]).toBeGreaterThanOrEqual(250);
    expect(bands.map((b) => b.minutes)).toEqual([5, 10, 15]);
    expect(bands[0].coordinates[0]).toEqual([45.78, 4.88]);
  });

  it('attend la fin du blocage après un 429, puis reprend', async () => {
    vi.useFakeTimers();
    const sent: number[] = [];
    const fetch = vi
      .fn()
      .mockImplementationOnce(() => {
        sent.push(Date.now());
        return Promise.resolve(response(429, { error: 'Too Many Requests' }));
      })
      .mockImplementation(() => {
        sent.push(Date.now());
        return Promise.resolve(response(200, polygon));
      });
    vi.stubGlobal('fetch', fetch);
    const { fetchIgnIsochrone } = await load();

    const pending = fetchIgnIsochrone(45.78, 4.88, [15], 'walking');
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(pending).resolves.toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    // Retry-After illisible depuis le navigateur : blocage de 5 s supposé
    expect(sent[1] - sent[0]).toBeGreaterThanOrEqual(5000);
  });

  it('suit l’en-tête Retry-After quand il est lisible', async () => {
    vi.useFakeTimers();
    const sent: number[] = [];
    const fetch = vi
      .fn()
      .mockImplementationOnce(() => {
        sent.push(Date.now());
        return Promise.resolve(response(429, {}, { 'Retry-After': '2' }));
      })
      .mockImplementation(() => {
        sent.push(Date.now());
        return Promise.resolve(response(200, polygon));
      });
    vi.stubGlobal('fetch', fetch);
    const { fetchIgnIsochrone } = await load();

    const pending = fetchIgnIsochrone(45.78, 4.88, [15], 'walking');
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(pending).resolves.toHaveLength(1);
    expect(sent[1] - sent[0]).toBe(2000);
  });

  it('abandonne après deux nouvelles tentatives', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValue(response(429, {}));
    vi.stubGlobal('fetch', fetch);
    const { fetchIgnIsochrone } = await load();

    const pending = fetchIgnIsochrone(45.78, 4.88, [15], 'walking');
    const outcome = expect(pending).rejects.toMatchObject({ kind: 'quota' });
    await vi.advanceTimersByTimeAsync(30_000);
    await outcome;
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('ne réessaie pas une autre erreur', async () => {
    const fetch = vi.fn().mockResolvedValue(response(400, { error: 'Bad Request' }));
    vi.stubGlobal('fetch', fetch);
    const { fetchIgnIsochrone } = await load();

    await expect(fetchIgnIsochrone(45.78, 4.88, [15], 'walking')).rejects.toMatchObject({ kind: 'failed', status: 400 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
