import { beforeEach, describe, expect, it, vi } from 'vitest';
import { categoryColors } from './design-system/tokens';

const load = () => import('./dataFetcher');

const jsonResponse = (body: unknown, ok = true) =>
  ({ ok, status: ok ? 200 : 404, json: () => Promise.resolve(body) }) as Response;

const site = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  uai: id.slice(0, 8),
  nom: `Site ${id}`,
  coordonnees: { lat: 45, lon: 5 },
  commune: 'Lyon',
  departement: 'Rhône',
  region: 'Auvergne-Rhône-Alpes',
  statut: 'public',
  types: ['Licence'],
  category: 'university',
  formations: 1,
  apprentissage: false,
  ...extra,
});

beforeEach(() => {
  vi.resetModules();
});

describe('fetchEtablissements', () => {
  it('colore les sites par catégorie et écarte les entrées mal formées', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse([site('0690001A'), site('0690002B', { category: 'lycee' }), { id: 'x' }, site('0690003C', { coordonnees: null })])
    );
    vi.stubGlobal('fetch', fetch);
    const { fetchEtablissements } = await load();

    const etabs = await fetchEtablissements();

    expect(fetch.mock.calls[0][0]).toMatch(/data\/etablissements\.json$/);
    expect(etabs.map((e) => [e.id, e.color])).toEqual([
      ['0690001A', categoryColors.university],
      ['0690002B', categoryColors.lycee],
    ]);
  });

  it('échoue sur une réponse HTTP en erreur ou un format inattendu', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(null, false)).mockResolvedValue(jsonResponse({})));
    const { fetchEtablissements } = await load();
    await expect(fetchEtablissements()).rejects.toThrow('HTTP 404');
    await expect(fetchEtablissements()).rejects.toThrow('Format');
  });
});

describe('fetchFormations', () => {
  it('charge une fois le fichier du préfixe d’UAI et renvoie les formations du site', async () => {
    const file = { '0690192J': [{ nom: 'Licence Maths', type: 'Licence', apprentissage: false }] };
    const fetch = vi.fn().mockResolvedValue(jsonResponse(file));
    vi.stubGlobal('fetch', fetch);
    const { fetchFormations } = await load();
    const insa = { ...site('0690192J'), uai: '0690192J' } as Parameters<typeof fetchFormations>[0];

    expect(await fetchFormations(insa)).toEqual(file['0690192J']);
    expect(await fetchFormations({ ...insa, id: '0690999Z', uai: '0690999Z' })).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toMatch(/data\/formations\/069\.json$/);
  });
});
