import { useState, useEffect, useCallback } from 'react';
import { Etablissement } from '../types/etablissement';
import { fetchAllEtablissementsData } from '../dataGouvFetcher';

export type EtablissementsStatus = 'loading' | 'ready' | 'error';

interface EtablissementsState {
  status: EtablissementsStatus;
  data?: Etablissement[];
  /** Enregistrements lus / total annoncé (indicateur de chargement) */
  loaded: number;
  total: number;
}

const INITIAL_STATE: EtablissementsState = { status: 'loading', loaded: 0, total: 0 };

/**
 * Liste des établissements, chargée une fois au montage, avec progression,
 * état d'erreur et nouvelle tentative.
 * Le service worker (cache data-gouv-api) assure la rapidité des rechargements.
 */
export const useEtablissements = () => {
  const [state, setState] = useState<EtablissementsState>(INITIAL_STATE);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchAllEtablissementsData(
      (loaded, total) => setState((s) => ({ ...s, loaded, total })),
      controller.signal
    )
      .then((data) => setState({ status: 'ready', data, loaded: data.length, total: data.length }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setState((s) => ({ ...s, status: 'error' }));
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setState(INITIAL_STATE);
    setAttempt((a) => a + 1);
  }, []);

  return {
    etablissementsGeoJSON: state.data,
    status: state.status,
    loaded: state.loaded,
    total: state.total,
    retry,
  };
};
