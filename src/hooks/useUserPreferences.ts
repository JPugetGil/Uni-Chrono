import { useState, useEffect } from 'react';
import { TransportMode, TRANSPORT_MODES } from '../types/transport';
import { isModeAvailable } from '../isochroneProvider';

/** Mode et durée mémorisés ; `initial` (lien partagé) a priorité sur la mémoire */
export const useUserPreferences = (initial: { mode?: TransportMode; duree?: number } = {}) => {
  const [timeInMinutes, setTimeInMinutes] = useState<number>(() => {
    if (initial.duree) return initial.duree;
    try {
      const saved = localStorage.getItem('timeInMinutes');
      const n = saved ? Number(saved) : NaN;
      // Durées proposées : une heure au plus
      return Number.isInteger(n) && n >= 1 && n <= 60 ? n : 15;
    } catch {
      return 15;
    }
  });

  const [transportMode, setTransportMode] = useState<TransportMode>(() => {
    if (initial.mode) return initial.mode;
    try {
      const saved = localStorage.getItem('transportMode');
      // Vélo ou transports mémorisés alors que la clé Geoapify n'est plus fournie : retour à la marche
      const allowed = new Set<string>(TRANSPORT_MODES.filter(isModeAvailable));
      return saved && allowed.has(saved) ? (saved as TransportMode) : 'walking';
    } catch {
      return 'walking';
    }
  });

  // Persister les préférences utilisateur (temps et mode) dans le localStorage
  useEffect(() => {
    try {
      localStorage.setItem('timeInMinutes', String(timeInMinutes));
    } catch {
      // ignore
    }
  }, [timeInMinutes]);

  useEffect(() => {
    try {
      localStorage.setItem('transportMode', transportMode);
    } catch {
      // ignore
    }
  }, [transportMode]);

  return {
    timeInMinutes,
    setTimeInMinutes,
    transportMode,
    setTransportMode,
  };
};
