import { useState, useEffect } from 'react';
import { Etablissement } from '../types/etablissement';
import { fetchAllEtablissementsData } from '../dataGouvFetcher';

/**
 * Liste des établissements, chargée une fois au montage.
 * Le service worker (cache data-gouv-api) assure la rapidité des rechargements.
 */
export const useEtablissements = () => {
  const [etablissementsGeoJSON, setEtablissementsGeoJSON] = useState<Etablissement[] | undefined>(undefined);

  useEffect(() => {
    fetchAllEtablissementsData().then(setEtablissementsGeoJSON).catch(console.error);
  }, []);

  return { etablissementsGeoJSON };
};
