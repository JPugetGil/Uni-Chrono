import { STATUTS, Statut } from '../types/etablissement';
import { TRANSPORT_MODES, TransportMode } from '../types/transport';
import { Filters } from './filters';

/**
 * État partageable de l'application, dans les paramètres de l'URL :
 * ?etab=0690192J&mode=walking&duree=15&region=…&formation=…
 */
export interface UrlState {
  etab?: string;
  /** Point de départ (adresse, position) dont on cherche les établissements accessibles */
  origin?: { lat: number; lon: number; label: string };
  mode?: TransportMode;
  duree?: number;
  filters: Filters;
}

// Paramètre d'URL (en français, lisible dans un lien partagé) pour chaque filtre
const FILTER_PARAMS: [keyof Filters, string][] = [
  ['region', 'region'],
  ['departement', 'departement'],
  ['commune', 'ville'],
  ['type', 'type'],
  ['statut', 'statut'],
  ['filiere', 'formation'],
  ['name', 'nom'],
];

export const parseUrlState = (search: string, availableModes: readonly TransportMode[] = TRANSPORT_MODES): UrlState => {
  const params = new URLSearchParams(search);
  const get = (name: string) => params.get(name)?.trim() || undefined;

  const mode = get('mode');
  const duree = Number(get('duree'));
  const filters: Filters = {};
  for (const [key, param] of FILTER_PARAMS) {
    const value = get(param);
    if (!value) continue;
    if (key === 'statut') {
      if ((STATUTS as string[]).includes(value)) filters.statut = value as Statut;
    } else {
      (filters as Record<string, string>)[key] = value;
    }
  }

  const [lat, lon] = (get('depuis') ?? '').split(',').map(Number);
  const origin =
    Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && get('depuis')
      ? { lat, lon, label: get('lieu') ?? `${lat}, ${lon}` }
      : undefined;

  return {
    etab: get('etab'),
    origin,
    mode: mode && (availableModes as string[]).includes(mode) ? (mode as TransportMode) : undefined,
    duree: Number.isInteger(duree) && duree >= 1 && duree <= 60 ? duree : undefined,
    filters,
  };
};

/** Chaîne de requête (« ?… », ou vide) représentant l'état */
export const serializeUrlState = (state: UrlState): string => {
  const params = new URLSearchParams();
  if (state.etab) params.set('etab', state.etab);
  if (state.origin) {
    params.set('depuis', `${state.origin.lat},${state.origin.lon}`);
    params.set('lieu', state.origin.label);
  }
  if (state.mode) params.set('mode', state.mode);
  if (state.duree) params.set('duree', String(state.duree));
  for (const [key, param] of FILTER_PARAMS) {
    const value = state.filters[key];
    if (value) params.set(param, value);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};
