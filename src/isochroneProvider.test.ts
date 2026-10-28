import { afterEach, describe, expect, it, vi } from 'vitest';

const response = (status: number, body: unknown) =>
  ({ ok: status < 400, status, headers: new Headers(), json: () => Promise.resolve(body) }) as Response;

const ignPolygon = (lon: number, lat: number) => ({
  geometry: { type: 'Polygon', coordinates: [[[lon, lat], [lon + 0.01, lat], [lon, lat + 0.01]]] },
});

/** Module neuf : les clés sont lues à l'import */
const load = async (env: Record<string, string> = {}) => {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import('./isochroneProvider');
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('zoneProviderFor', () => {
  it('utilise Mapbox quand la clé est là, Geoapify pour les transports', async () => {
    const { zoneProviderFor, batchAllowed } = await load();
    expect(zoneProviderFor('walking')).toBe('mapbox');
    expect(zoneProviderFor('cycling')).toBe('mapbox');
    expect(zoneProviderFor('transit')).toBe('geoapify');
    expect(batchAllowed('walking')).toBe(true);
    expect(batchAllowed('transit')).toBe(false);
  });

  it('ignore une clé Mapbox qui n’est pas un jeton public « pk. »', async () => {
    const { zoneProviderFor } = await load({ VITE_MAPBOX_API_KEY: 'sk.secret' });
    expect(zoneProviderFor('walking')).toBe('ign');
  });

  it('se replie sur l’IGN sans clé Mapbox, sauf pour le vélo', async () => {
    const { zoneProviderFor, batchAllowed } = await load({ VITE_MAPBOX_API_KEY: '', VITE_GEOAPIFY_API_KEY: '' });
    expect(zoneProviderFor('walking')).toBe('ign');
    expect(zoneProviderFor('driving')).toBe('ign');
    expect(zoneProviderFor('cycling')).toBeNull();
    expect(zoneProviderFor('transit')).toBeNull();
    expect(batchAllowed('walking')).toBe(false);
  });
});

describe('fetchZone', () => {
  it('sans clé Mapbox, demande chaque durée à l’IGN (piéton) et renvoie les bandes', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(response(200, ignPolygon(4.88, 45.78))));
    vi.stubGlobal('fetch', fetch);
    const { fetchZone } = await load({ VITE_MAPBOX_API_KEY: '' });

    const bands = await fetchZone(45.78, 4.88, [10, 5], 'walking');

    expect(fetch).toHaveBeenCalledTimes(2);
    const first = new URL(fetch.mock.calls[0][0]);
    expect(first.origin + first.pathname).toBe('https://data.geopf.fr/navigation/isochrone');
    expect(Object.fromEntries(first.searchParams)).toMatchObject({ point: '4.88,45.78', costValue: '300', profile: 'pedestrian' });
    expect(bands.map((b) => b.minutes)).toEqual([5, 10]);
    expect(bands[0].coordinates[0]).toEqual([45.78, 4.88]);
  });

  it('passe à l’IGN si Mapbox refuse la clé, à pied comme en voiture', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(401, { message: 'Not Authorized' }))
      .mockResolvedValue(response(200, ignPolygon(4.88, 45.78)));
    vi.stubGlobal('fetch', fetch);
    const { fetchZone } = await load();

    const bands = await fetchZone(45.78, 4.88, [15], 'driving');

    expect(new URL(fetch.mock.calls[0][0]).hostname).toBe('api.mapbox.com');
    expect(new URL(fetch.mock.calls[1][0]).searchParams.get('profile')).toBe('car');
    expect(bands).toHaveLength(1);
  });

  it('passe aussi à l’IGN quand Mapbox est injoignable (401 sans CORS vu comme une erreur réseau)', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockImplementation((url: string) =>
      url.includes('api.mapbox.com') ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve(response(200, ignPolygon(4.88, 45.78)))
    );
    vi.stubGlobal('fetch', fetch);
    const { fetchZone } = await load();

    const pending = fetchZone(45.78, 4.88, [15], 'walking');
    // Nouvelles tentatives Mapbox (0,5 s, 1 s, 2 s) puis IGN
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(pending).resolves.toHaveLength(1);
    expect(fetch.mock.calls[fetch.mock.calls.length - 1][0]).toContain('data.geopf.fr/navigation/isochrone');
    vi.useRealTimers();
  });

  it('signale la clé refusée en vélo, que l’IGN ne sait pas calculer', async () => {
    const fetch = vi.fn().mockResolvedValue(response(401, { message: 'Not Authorized' }));
    vi.stubGlobal('fetch', fetch);
    const { fetchZone } = await load();

    await expect(fetchZone(45.78, 4.88, [15], 'cycling')).rejects.toMatchObject({ kind: 'auth' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
