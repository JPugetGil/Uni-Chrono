import { afterEach, describe, expect, it, vi } from 'vitest';

const response = (status: number, body: unknown) =>
  ({ ok: status < 400, status, headers: new Headers(), json: () => Promise.resolve(body) }) as Response;

const ignPolygon = (lon: number, lat: number) => ({
  geometry: { type: 'Polygon', coordinates: [[[lon, lat], [lon + 0.01, lat], [lon, lat + 0.01]]] },
});

/** Module neuf : la clé est lue à l'import */
const load = async (env: Record<string, string> = {}) => {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import('./isochroneProvider');
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('zoneProviderFor', () => {
  it('confie la marche et la voiture à l’IGN, le vélo et les transports à Geoapify', async () => {
    const { zoneProviderFor, availableModes } = await load();
    expect(zoneProviderFor('walking')).toBe('ign');
    expect(zoneProviderFor('driving')).toBe('ign');
    expect(zoneProviderFor('cycling')).toBe('geoapify');
    expect(zoneProviderFor('transit')).toBe('geoapify');
    expect(availableModes()).toEqual(['walking', 'cycling', 'driving', 'transit']);
  });

  it('sans clé Geoapify, ne propose que la marche et la voiture', async () => {
    const { isModeAvailable, availableModes } = await load({ VITE_GEOAPIFY_API_KEY: '' });
    expect(isModeAvailable('walking')).toBe(true);
    expect(isModeAvailable('cycling')).toBe(false);
    expect(isModeAvailable('transit')).toBe(false);
    expect(availableModes()).toEqual(['walking', 'driving']);
  });
});

describe('fetchZone', () => {
  it('demande la marche à l’IGN (piéton), une durée par requête', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(response(200, ignPolygon(4.88, 45.78))));
    vi.stubGlobal('fetch', fetch);
    const { fetchZone } = await load();

    const pending = fetchZone(45.78, 4.88, [10, 5], 'walking');
    await vi.advanceTimersByTimeAsync(1000);
    const bands = await pending;

    expect(fetch).toHaveBeenCalledTimes(2);
    const first = new URL(fetch.mock.calls[0][0]);
    expect(first.origin + first.pathname).toBe('https://data.geopf.fr/navigation/isochrone');
    expect(Object.fromEntries(first.searchParams)).toMatchObject({ point: '4.88,45.78', costValue: '300', profile: 'pedestrian' });
    expect(bands.map((b) => b.minutes)).toEqual([5, 10]);
  });

  it('demande le vélo à Geoapify, toutes les durées en une requête', async () => {
    const fetch = vi.fn().mockResolvedValue(response(200, { type: 'FeatureCollection', features: [] }));
    vi.stubGlobal('fetch', fetch);
    const { fetchZone } = await load();

    await fetchZone(45.78, 4.88, [5, 10, 15], 'cycling');

    expect(fetch).toHaveBeenCalledTimes(1);
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.hostname).toBe('api.geoapify.com');
    expect(url.searchParams.get('mode')).toBe('bicycle');
    expect(url.searchParams.get('range')).toBe('300,600,900');
  });

  it('sans clé Geoapify, refuse le vélo sans rien envoyer', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { fetchZone } = await load({ VITE_GEOAPIFY_API_KEY: '' });

    await expect(fetchZone(45.78, 4.88, [15], 'cycling')).rejects.toMatchObject({ kind: 'unconfigured' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
