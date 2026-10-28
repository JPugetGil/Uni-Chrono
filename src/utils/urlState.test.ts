import { describe, expect, it } from 'vitest';
import { parseUrlState, serializeUrlState } from './urlState';

describe('parseUrlState', () => {
  it('lit l’établissement, le trajet et les filtres', () => {
    expect(
      parseUrlState('?etab=0690192J&mode=cycling&duree=30&region=Bretagne&ville=Brest&statut=public&formation=BTS%20-%20SIO&nom=insa')
    ).toEqual({
      etab: '0690192J',
      origin: undefined,
      mode: 'cycling',
      duree: 30,
      filters: { region: 'Bretagne', commune: 'Brest', statut: 'public', filiere: 'BTS - SIO', name: 'insa' },
    });
  });

  it('ignore les valeurs invalides ou indisponibles', () => {
    expect(parseUrlState('?mode=teleportation&duree=90&statut=inconnu&region=&depuis=abc')).toEqual({
      etab: undefined,
      origin: undefined,
      mode: undefined,
      duree: undefined,
      filters: {},
    });
    // Mode transports sans clé Geoapify
    expect(parseUrlState('?mode=transit', ['walking', 'cycling', 'driving']).mode).toBeUndefined();
  });
});

describe('serializeUrlState', () => {
  it('produit une URL relisible à l’identique', () => {
    const state = {
      etab: '0690192J@45.7833,4.8781',
      origin: { lat: 45.7826, lon: 4.8737, label: '20 Avenue Albert Einstein 69100 Villeurbanne' },
      mode: 'walking' as const,
      duree: 15,
      filters: { departement: 'Rhône', filiere: "Formation d'ingénieur Bac + 5" },
    };
    const query = serializeUrlState(state);
    expect(query).toContain('etab=0690192J%404');
    expect(parseUrlState(query)).toEqual(state);
  });

  it('renvoie une chaîne vide sans état', () => {
    expect(serializeUrlState({ filters: {} })).toBe('');
  });
});
