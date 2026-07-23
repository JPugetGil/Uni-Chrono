import { useState, useEffect, useRef, useCallback } from 'react';
import { Isochrone } from '../types/isochrone';
import { Etablissement } from '../types/etablissement';
import { fetchIsochroneData } from '../mapboxFetcher';
import { TransportMode } from '../types/transport';

const etabId = (e: Etablissement) => e.uai || `${e.coordonnees.lat},${e.coordonnees.lon}`;

/**
 * Isochrones à la demande : rien n'est pré-calculé ni persisté.
 * `requestIsochrones(etabs)` lance le calcul des isochrones manquantes
 * (pins visibles via le bouton carte, ou établissement sélectionné) ;
 * les résultats sont accumulés en mémoire pour la config courante (mode + temps).
 */
export const useIsochrones = (
  timeInMinutes: number,
  transportMode: TransportMode
) => {
  const configKey = `${transportMode}:${timeInMinutes}`;
  const [isochrones, setIsochrones] = useState<Isochrone[]>([]);
  // Lot en cours : pending = requêtes en vol, total = taille du lot (pour l'anneau de progression)
  const [batch, setBatch] = useState({ pending: 0, total: 0 });

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
    setBatch({ pending: 0, total: 0 });

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
      }));

      const signal = controllerRef.current.signal;
      for (const etablissement of todo) {
        fetchIsochroneData(
          etablissement.coordonnees.lat,
          etablissement.coordonnees.lon,
          timeInMinutes * 60,
          transportMode,
          signal
        )
          .then((coordinates) => {
            if (signal.aborted || !coordinates || coordinates.length === 0) return;
            const isochrone: Isochrone = {
              coordinates,
              color: etablissement.color || '#000000',
              etablissementId: etabId(etablissement),
            };
            setIsochrones((prev) => [...prev, isochrone]);
          })
          .catch(() => {
            // ignore individual fetch errors (including abort)
          })
          .finally(() => {
            // Succès comme échec : la requête est terminée (sauf abort = reset de config)
            if (!signal.aborted) {
              setBatch((b) => ({ pending: Math.max(0, b.pending - 1), total: b.total }));
            }
          });
      }
    },
    [timeInMinutes, transportMode]
  );

  return {
    isochrones,
    requestIsochrones,
    pendingCount: batch.pending,
    batchTotal: batch.total,
  };
};
