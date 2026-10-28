import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTransitIsochrone } from './geoapifyFetcher';

const response = (status: number, body: unknown) =>
  ({ ok: status < 400, status, headers: new Headers(), json: () => Promise.resolve(body) }) as Response;

// Deux îlots autour d'arrêts pour 10 min, un seul pour 5 min ; ordre quelconque
const isolines = {
  type: 'FeatureCollection',
  features: [
    {
      properties: { range: 600 },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [[[4.8, 45.7], [4.81, 45.7], [4.81, 45.71]]],
          [[[4.9, 45.8], [4.91, 45.8], [4.91, 45.81]]],
        ],
      },
    },
    { properties: { range: 300 }, geometry: { type: 'Polygon', coordinates: [[[4.8, 45.7], [4.805, 45.7], [4.805, 45.705]]] } },
  ],
};

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchTransitIsochrone', () => {
  it('demande toutes les durées en une requête et renvoie des bandes triées, îlots compris', async () => {
    const fetch = vi.fn().mockResolvedValue(response(200, isolines));
    vi.stubGlobal('fetch', fetch);

    const bands = await fetchTransitIsochrone(45.7, 4.8, [10, 5]);

    const url = new URL(fetch.mock.calls[0][0]);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      lat: '45.7',
      lon: '4.8',
      type: 'time',
      mode: 'transit',
      range: '300,600',
      apiKey: 'test-geoapify',
    });
    expect(bands.map((b) => b.minutes)).toEqual([5, 10]);
    expect(bands[1].coordinates).toHaveLength(2);
    expect(bands[1].coordinates[0]).toEqual([[45.7, 4.8], [45.7, 4.81], [45.71, 4.81]]);
  });

  it('interroge de nouveau avec l’identifiant tant que le calcul est en cours (202)', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(202, { type: 'FeatureCollection', features: [], properties: { id: 'job-42' } }))
      .mockResolvedValueOnce(response(202, { type: 'FeatureCollection', features: [], properties: { id: 'job-42' } }))
      .mockResolvedValue(response(200, isolines));
    vi.stubGlobal('fetch', fetch);

    const pending = fetchTransitIsochrone(45.7, 4.8, [5, 10]);
    await vi.runAllTimersAsync();
    const bands = await pending;

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(Object.fromEntries(new URL(fetch.mock.calls[2][0]).searchParams)).toEqual({ id: 'job-42', apiKey: 'test-geoapify' });
    expect(bands).toHaveLength(2);
  });

  it('signale une clé refusée sans réessayer', async () => {
    const fetch = vi.fn().mockResolvedValue(response(401, { message: 'Invalid apiKey' }));
    vi.stubGlobal('fetch', fetch);

    await expect(fetchTransitIsochrone(45.7, 4.8, [15])).rejects.toMatchObject({ kind: 'auth' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
