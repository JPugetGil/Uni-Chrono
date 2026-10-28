import { useEffect, useMemo, useState } from 'react';
import { Isochrone } from '../types/isochrone';
import { fetchCommunes } from '../housingFetcher';
import { CommuneInfo } from '../types/commune';
import { HousingCommune, communesInIsochrone } from '../utils/housing';

export type HousingStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Communes et loyers, chargés une fois (null pendant le chargement), et échec éventuel */
export const useCommunes = () => {
  const [communes, setCommunes] = useState<CommuneInfo[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCommunes()
      .then((c) => {
        if (active) setCommunes(c);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return { communes, failed };
};

/**
 * Communes couvertes par l'isochrone d'un établissement, avec loyer €/m²
 * (voir communesInIsochrone).
 */
export const useHousing = (isochrone?: Isochrone) => {
  const { communes, failed } = useCommunes();

  return useMemo((): { status: HousingStatus; items: HousingCommune[] } => {
    if (!isochrone || isochrone.coordinates.length === 0) return { status: 'idle', items: [] };
    if (failed) return { status: 'error', items: [] };
    if (!communes) return { status: 'loading', items: [] };

    return { status: 'ready', items: communesInIsochrone(isochrone.coordinates, communes) };
  }, [isochrone, communes, failed]);
};
