import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchIsochroneData } from './mapboxFetcher';

const feature = (contour: number, lon: number, lat: number) => ({
  type: 'Feature',
  properties: { contour },
  geometry: { type: 'Polygon', coordinates: [[[lon, lat], [lon + 0.01, lat], [lon, lat + 0.01]]] },
});

const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  ({ ok: status < 400, status, headers: new Headers(headers), json: () => Promise.resolve(body) }) as Response;

const empty = { type: 'FeatureCollection', features: [] };

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchIsochroneData', () => {
  it('demande toutes les bandes en une requête et les renvoie triées, en [lat, lon]', async () => {
    // Mapbox peut renvoyer les contours dans n'importe quel ordre
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({ type: 'FeatureCollection', features: [feature(15, 4.9, 45.8), feature(5, 4.88, 45.78), feature(10, 4.89, 45.79)] })
    );
    vi.stubGlobal('fetch', fetch);

    const bands = await fetchIsochroneData(45.78, 4.88, [15, 5, 10], 'walking');

    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.pathname).toBe('/isochrone/v1/mapbox/walking/4.88,45.78');
    expect(url.searchParams.get('contours_minutes')).toBe('5,10,15');
    expect(bands.map((b) => b.minutes)).toEqual([5, 10, 15]);
    expect(bands[0].coordinates[0]).toEqual([45.78, 4.88]);
  });

  it('borne les durées à 1–60 min et garde au plus 4 contours', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ type: 'FeatureCollection', features: [] }));
    vi.stubGlobal('fetch', fetch);

    await fetchIsochroneData(45, 5, [0, 10, 20, 30, 90], 'cycling');

    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.searchParams.get('contours_minutes')).toBe('10,20,30,60');
  });

  it('remplace un profil non géré par « driving »', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ type: 'FeatureCollection', features: [] }));
    vi.stubGlobal('fetch', fetch);

    await fetchIsochroneData(45, 5, [15], 'transit');

    expect(new URL(fetch.mock.calls[0][0]).pathname).toContain('/mapbox/driving/');
  });

  it('ne réessaie pas une clé refusée et signale la cause', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ message: 'Not Authorized' }, 401));
    vi.stubGlobal('fetch', fetch);

    await expect(fetchIsochroneData(45, 5, [15], 'walking')).rejects.toMatchObject({ kind: 'auth' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('réessaie après une erreur serveur, et après le délai Retry-After d’un quota dépassé', async () => {
    // Module neuf : son limiteur de débit doit tourner sur les minuteurs simulés
    vi.useFakeTimers();
    vi.resetModules();
    const { fetchIsochroneData } = await import('./mapboxFetcher');
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse({}, 429, { 'Retry-After': '3' }))
      .mockResolvedValue(jsonResponse(empty));
    vi.stubGlobal('fetch', fetch);

    const pending = fetchIsochroneData(45, 5, [15], 'walking');
    await vi.advanceTimersByTimeAsync(600);
    expect(fetch).toHaveBeenCalledTimes(2);
    // 429 : attente de 3 s demandée par le service, pas du simple délai exponentiel (1 s)
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1500);
    await expect(pending).resolves.toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
