import { describe, expect, it, vi } from 'vitest';
import { fetchIsochroneData } from './mapboxFetcher';

const feature = (contour: number, lon: number, lat: number) => ({
  type: 'Feature',
  properties: { contour },
  geometry: { type: 'Polygon', coordinates: [[[lon, lat], [lon + 0.01, lat], [lon, lat + 0.01]]] },
});

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: () => Promise.resolve(body) }) as Response;

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
});
