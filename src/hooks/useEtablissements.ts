import { useState, useEffect, useCallback } from 'react';
import { Etablissement } from '../types/etablissement';
import { fetchEtablissements } from '../dataFetcher';

export type EtablissementsStatus = 'loading' | 'ready' | 'error';

/**
 * Sites d'enseignement, chargés une fois au montage (un seul fichier statique),
 * avec état d'erreur et nouvelle tentative.
 */
export const useEtablissements = () => {
  const [state, setState] = useState<{ status: EtablissementsStatus; data?: Etablissement[] }>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchEtablissements(controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setState({ status: 'error' });
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((a) => a + 1);
  }, []);

  return { etablissementsGeoJSON: state.data, status: state.status, retry };
};
