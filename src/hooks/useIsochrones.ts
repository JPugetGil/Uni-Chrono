import { useState, useEffect, useRef, useCallback } from 'react';
import { Isochrone, bandMinutes } from '../types/isochrone';
import { Etablissement } from '../types/etablissement';
import { fetchIsochroneData } from '../mapboxFetcher';
import { TransportMode } from '../types/transport';
import { etabId } from '../utils/filters';

/** État d'une isochrone demandée et pas (encore) disponible */
export type IsochroneRequestStatus = 'pending' | 'error';

/**
 * Isochrones à la demande : rien n'est pré-calculé ni persisté.
 * `requestIsochrones(etabs)` lance le calcul des isochrones manquantes
 * (établissements visibles via le bouton carte, ou établissement sélectionné) ;
 * les résultats sont accumulés en mémoire pour la config courante (mode + temps).
 * Chaque requête renvoie aussi les bandes de temps intermédiaires.
 */
export const useIsochrones = (
  timeInMinutes: number,
  transportMode: TransportMode
) => {
  const configKey = `${transportMode}:${timeInMinutes}`;
  const [isochrones, setIsochrones] = useState<Isochrone[]>([]);
  // Lot en cours : pending = requêtes en vol, total = taille du lot, failed = échecs (progression et bilan)
  const [batch, setBatch] = useState({ pending: 0, total: 0, failed: 0 });
  // Statut des isochrones en vol ou en échec, par établissement (fiche de l'établissement)
  const [statusById, setStatusById] = useState<Record<string, IsochroneRequestStatus>>({});

  // Identifiants déjà demandés pour la config courante (évite les doublons)
  const requestedIdsRef = useRef<Set<string>>(new Set());
  const controllerRef = useRef<AbortController>(new AbortController());

  // Changement de config (mode+temps) : abandon des requêtes en cours et reset
  useEffect(() => {
    controllerRef.current.abort();
    controllerRef.current = new AbortController();
    requestedIdsRef.current = new Set();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset synchrone au changement de configuration
    setIsochrones([]);
    setBatch({ pending: 0, total: 0, failed: 0 });
    setStatusById({});

    return () => controllerRef.current.abort();
  }, [configKey]);

  const requestIsochrones = useCallback(
    (etabs: Etablissement[]) => {
      // Le mode transit (Navitia) est géré à la sélection par useTransitIsochrone
      if (transportMode === 'transit') return;

      const todo = etabs.filter(
        (e) =>
          e.coordonnees?.lat != null &&
          e.coordonnees?.lon != null &&
          !requestedIdsRef.current.has(etabId(e))
      );
      if (todo.length === 0) return;

      for (const e of todo) requestedIdsRef.current.add(etabId(e));
      // Nouveau lot si rien en vol, sinon on agrandit le lot courant
      setBatch((b) => ({
        pending: b.pending + todo.length,
        total: (b.pending === 0 ? 0 : b.total) + todo.length,
        failed: b.pending === 0 ? 0 : b.failed,
      }));
      setStatusById((prev) => {
        const next = { ...prev };
        for (const e of todo) next[etabId(e)] = 'pending';
        return next;
      });

      const signal = controllerRef.current.signal;
      const minutes = bandMinutes(timeInMinutes);
      for (const etablissement of todo) {
        const id = etabId(etablissement);
        fetchIsochroneData(
          etablissement.coordonnees.lat,
          etablissement.coordonnees.lon,
          minutes,
          transportMode,
          signal
        )
          .then((bands) => {
            if (signal.aborted) return;
            const outer = bands[bands.length - 1];
            if (!outer) throw new Error('Empty isochrone');
            const isochrone: Isochrone = {
              coordinates: outer.coordinates,
              bands,
              color: etablissement.color || '#000000',
              etablissementId: id,
            };
            setIsochrones((prev) => [...prev, isochrone]);
            setStatusById((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          })
          .catch(() => {
            // Échec (hors abort) : retirer l'id des demandes pour permettre
            // une nouvelle tentative (bouton de la carte ou de la fiche)
            if (!signal.aborted) {
              requestedIdsRef.current.delete(id);
              setStatusById((prev) => ({ ...prev, [id]: 'error' }));
              setBatch((b) => ({ ...b, failed: b.failed + 1 }));
            }
          })
          .finally(() => {
            // Succès comme échec : la requête est terminée (sauf abort = reset de config)
            if (!signal.aborted) {
              setBatch((b) => ({ ...b, pending: Math.max(0, b.pending - 1) }));
            }
          });
      }
    },
    [timeInMinutes, transportMode]
  );

  return {
    isochrones,
    requestIsochrones,
    statusById,
    pendingCount: batch.pending,
    batchTotal: batch.total,
    batchFailed: batch.failed,
  };
};
