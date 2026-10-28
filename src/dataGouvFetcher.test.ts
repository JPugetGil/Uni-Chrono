import { describe, expect, it, vi } from 'vitest';
import { fetchAllEtablissementsData } from './dataGouvFetcher';
import { categoryColors } from './design-system/tokens';

const record = (uai: string | null, extra: Record<string, unknown> = {}) => ({
  uai,
  implantation_lib: `Site ${uai}`,
  type_d_etablissement: 'Université',
  coordonnees: { lat: 45, lon: 5 },
  ...extra,
});

const page = (results: unknown[], total: number) =>
  ({ ok: true, status: 200, json: () => Promise.resolve({ total_count: total, results }) }) as Response;

describe('fetchAllEtablissementsData', () => {
  it('parcourt toutes les pages, sans requête en trop, et signale la progression', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(page([record('A'), record('B')], 250))
      .mockResolvedValueOnce(page([record('C')], 250))
      .mockResolvedValueOnce(page([record('D')], 250));
    vi.stubGlobal('fetch', fetch);
    const progress: [number, number][] = [];

    const etabs = await fetchAllEtablissementsData((loaded, total) => progress.push([loaded, total]));

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls.map(([url]) => new URL(url).searchParams.get('offset'))).toEqual(['0', '100', '200']);
    expect(progress).toEqual([[100, 250], [200, 250], [250, 250]]);
    expect(etabs.map((e) => e.uai)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('écarte les doublons d’UAI et les enregistrements sans UAI ou sans coordonnées', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        page([record('A'), record('A'), record(null), record('B', { coordonnees: null }), record('C')], 5)
      )
    );
    const etabs = await fetchAllEtablissementsData();
    expect(etabs.map((e) => e.uai)).toEqual(['A', 'C']);
  });

  it('colore chaque établissement selon sa catégorie', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(page([record('A'), record('B', { type_d_etablissement: 'Grand établissement' })], 2))
    );
    const [university, grand] = await fetchAllEtablissementsData();
    expect(university.color).toBe(categoryColors.university);
    expect(grand.color).toBe(categoryColors.grand);
  });

  it('échoue sur une réponse HTTP en erreur', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response));
    await expect(fetchAllEtablissementsData()).rejects.toThrow('HTTP 500');
  });
});
