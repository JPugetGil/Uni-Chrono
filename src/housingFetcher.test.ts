import { beforeEach, describe, expect, it, vi } from 'vitest';

// Les fetchers gardent leur promesse en cache au niveau du module : on
// réimporte un module neuf pour chaque test.
const load = () => import('./housingFetcher');

const csv = [
  '"id_zone";"INSEE_C";"LIBGEO";"EPCI";"DEP";"REG";"loypredm2";"lwr.IPm2";"upr.IPm2"',
  '"1";"69266";"Villeurbanne";"200046977";"69";"84";16,8;13,4;21,1',
  '"2";"69034";"Caluire-et-Cuire";"200046977";"69";"84";16,7;NA;NA',
  '"3";"";"Sans code";"";"";"";12,0;10;14',
  'ligne incomplète',
].join('\n');

const textResponse = (body: string, ok = true) =>
  ({ ok, status: ok ? 200 : 503, text: () => Promise.resolve(body), json: () => Promise.resolve(JSON.parse(body)) }) as Response;

beforeEach(() => {
  vi.resetModules();
});

describe('fetchRents', () => {
  it('lit le loyer et la fourchette (virgule décimale) par code INSEE', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse(csv)));
    const { fetchRents } = await load();
    const rents = await fetchRents();
    expect(rents.size).toBe(2);
    expect(rents.get('69266')).toEqual({ rent: 16.8, low: 13.4, high: 21.1 });
    expect(rents.get('69034')).toEqual({ rent: 16.7, low: undefined, high: undefined });
  });

  it('met le résultat en cache, mais réessaie après un échec', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(textResponse('', false)).mockResolvedValue(textResponse(csv));
    vi.stubGlobal('fetch', fetch);
    const { fetchRents } = await load();
    await expect(fetchRents()).rejects.toThrow('HTTP 503');
    await fetchRents();
    await fetchRents();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('fetchCommunes', () => {
  it('écarte les communes sans centre et convertit [lon, lat]', async () => {
    const body = JSON.stringify([
      { code: '69266', nom: 'Villeurbanne', population: 163684, centre: { coordinates: [4.88, 45.77] } },
      { code: '00000', nom: 'Sans centre' },
    ]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse(body)));
    const { fetchCommunes } = await load();
    expect(await fetchCommunes()).toEqual([{ code: '69266', nom: 'Villeurbanne', population: 163684, lat: 45.77, lon: 4.88 }]);
  });
});

describe('fetchCommuneContour', () => {
  it('renvoie les anneaux extérieurs d’un multi-polygone en [lat, lon]', async () => {
    const body = JSON.stringify({
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [[[1, 2], [3, 4], [5, 6]], [[9, 9], [9, 9], [9, 9]]],
          [[[7, 8], [9, 10], [11, 12]]],
        ],
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse(body)));
    const { fetchCommuneContour } = await load();
    expect(await fetchCommuneContour('69266')).toEqual([
      [[2, 1], [4, 3], [6, 5]],
      [[8, 7], [10, 9], [12, 11]],
    ]);
  });
});
