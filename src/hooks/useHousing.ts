import { useEffect, useMemo, useState } from 'react';
import { Isochrone } from '../types/isochrone';
import { CommuneInfo, RentInfo, fetchCommunes, fetchRents } from '../housingFetcher';
import { HousingCommune, communesInIsochrone } from '../utils/housing';

export type HousingStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Communes couvertes par l'isochrone d'un établissement, avec loyer €/m²
 * (voir communesInIsochrone). Communes et loyers sont chargés une fois.
 */
export const useHousing = (isochrone?: Isochrone) => {
  const [communes, setCommunes] = useState<CommuneInfo[] | null>(null);
  const [rents, setRents] = useState<Map<string, RentInfo> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchCommunes(), fetchRents()])
      .then(([c, r]) => {
        if (active) {
          setCommunes(c);
          setRents(r);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return useMemo((): { status: HousingStatus; items: HousingCommune[] } => {
    if (!isochrone || isochrone.coordinates.length === 0) return { status: 'idle', items: [] };
    if (failed) return { status: 'error', items: [] };
    if (!communes || !rents) return { status: 'loading', items: [] };

    return { status: 'ready', items: communesInIsochrone(isochrone.coordinates, communes, rents) };
  }, [isochrone, communes, rents, failed]);
};
