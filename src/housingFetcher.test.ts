import { beforeEach, describe, expect, it, vi } from 'vitest';

// Les fetchers gardent leur promesse en cache au niveau du module : on
// réimporte un module neuf pour chaque test.
const load = () => import('./housingFetcher');

const jsonResponse = (body: unknown, ok = true) =>
  ({ ok, status: ok ? 200 : 503, json: () => Promise.resolve(body) }) as Response;

beforeEach(() => {
  vi.resetModules();
});

describe('fetchCommunes', () => {
  it('lit les lignes compactes de communes.json, loyer facultatif', async () => {
    const rows = [
      ['69266', 'Villeurbanne', 163684, 45.77, 4.88, 16.8, 13.4, 21.1],
      ['00000', 'Sans loyer', 10, 45, 5, null, null, null],
    ];
    const fetch = vi.fn().mockResolvedValue(jsonResponse(rows));
    vi.stubGlobal('fetch', fetch);
    const { fetchCommunes } = await load();

    expect(await fetchCommunes()).toEqual([
      { code: '69266', nom: 'Villeurbanne', population: 163684, lat: 45.77, lon: 4.88, rent: 16.8, rentLow: 13.4, rentHigh: 21.1 },
      { code: '00000', nom: 'Sans loyer', population: 10, lat: 45, lon: 5 },
    ]);
    expect(fetch.mock.calls[0][0]).toMatch(/data\/communes\.json$/);
  });

  it('met le résultat en cache, mais réessaie après un échec', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(jsonResponse(null, false)).mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetch);
    const { fetchCommunes } = await load();
    await expect(fetchCommunes()).rejects.toThrow('HTTP 503');
    await fetchCommunes();
    await fetchCommunes();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('fetchCommuneContour', () => {
  it('renvoie les anneaux extérieurs d’un multi-polygone en [lat, lon]', async () => {
    const body = {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [[[1, 2], [3, 4], [5, 6]], [[9, 9], [9, 9], [9, 9]]],
          [[[7, 8], [9, 10], [11, 12]]],
        ],
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(body)));
    const { fetchCommuneContour } = await load();
    expect(await fetchCommuneContour('69266')).toEqual([
      [[2, 1], [4, 3], [6, 5]],
      [[8, 7], [10, 9], [12, 11]],
    ]);
  });
});
