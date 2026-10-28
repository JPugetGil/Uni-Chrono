import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IsochroneBand } from './types/isochrone';
import { fetchZone } from './isochroneProvider';
import { clearZoneCache, getZone, peekZone, zoneKey } from './zoneCache';

vi.mock('./isochroneProvider', () => ({ fetchZone: vi.fn() }));

const fetchZoneMock = vi.mocked(fetchZone);
const BANDS: IsochroneBand[] = [{ minutes: 15, coordinates: [[45.78, 4.88], [45.79, 4.88], [45.78, 4.89]] }];

/** Promesse résolue à la main, pour observer une demande en cours */
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  clearZoneCache();
  fetchZoneMock.mockReset();
});

afterEach(() => {
  clearZoneCache();
});

describe('zoneKey', () => {
  it('arrondit la position à ~11 m : deux sites d’un même campus partagent la zone', () => {
    expect(zoneKey(45.78312, 4.87809, [5, 10, 15], 'walking')).toBe(zoneKey(45.78309, 4.87811, [5, 10, 15], 'walking'));
    expect(zoneKey(45.7831, 4.8781, [5, 10, 15], 'walking')).not.toBe(zoneKey(45.7831, 4.8781, [5, 10, 15], 'cycling'));
    expect(zoneKey(45.7831, 4.8781, [5, 10, 15], 'walking')).not.toBe(zoneKey(45.7831, 4.8781, [10, 20, 30], 'walking'));
  });
});

describe('getZone', () => {
  it('partage une demande en cours, puis sert la zone sans requête', async () => {
    const pending = deferred<IsochroneBand[]>();
    fetchZoneMock.mockReturnValue(pending.promise);

    const a = getZone(45.78, 4.88, [15], 'walking');
    const b = getZone(45.78, 4.88, [15], 'walking');
    expect(peekZone(45.78, 4.88, [15], 'walking')).toBeUndefined();
    pending.resolve(BANDS);

    expect(await a).toBe(BANDS);
    expect(await b).toBe(BANDS);
    expect(await getZone(45.78, 4.88, [15], 'walking')).toBe(BANDS);
    expect(peekZone(45.78, 4.88, [15], 'walking')).toBe(BANDS);
    expect(fetchZoneMock).toHaveBeenCalledTimes(1);
  });

  it('ne garde ni un échec ni une zone vide', async () => {
    fetchZoneMock.mockRejectedValueOnce(new Error('HTTP 500')).mockResolvedValueOnce([]).mockResolvedValue(BANDS);

    await expect(getZone(45.78, 4.88, [15], 'walking')).rejects.toThrow('HTTP 500');
    expect(await getZone(45.78, 4.88, [15], 'walking')).toEqual([]);
    expect(await getZone(45.78, 4.88, [15], 'walking')).toBe(BANDS);
    expect(fetchZoneMock).toHaveBeenCalledTimes(3);
  });

  it('annule la demande quand plus personne ne l’attend', async () => {
    fetchZoneMock.mockReturnValue(new Promise(() => {}));
    const first = new AbortController();
    const second = new AbortController();

    const a = getZone(45.78, 4.88, [15], 'walking', first.signal);
    const b = getZone(45.78, 4.88, [15], 'walking', second.signal);
    const serviceSignal = fetchZoneMock.mock.calls[0][4] as AbortSignal;

    first.abort();
    await expect(a).rejects.toMatchObject({ name: 'AbortError' });
    expect(serviceSignal.aborted).toBe(false);

    second.abort();
    await expect(b).rejects.toMatchObject({ name: 'AbortError' });
    expect(serviceSignal.aborted).toBe(true);

    // Demande abandonnée : la suivante repart de zéro
    fetchZoneMock.mockResolvedValue(BANDS);
    expect(await getZone(45.78, 4.88, [15], 'walking')).toBe(BANDS);
    expect(fetchZoneMock).toHaveBeenCalledTimes(2);
  });
});
