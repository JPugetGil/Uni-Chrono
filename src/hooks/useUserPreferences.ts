import { useState, useEffect } from 'react';
import { TransportMode, TRANSPORT_MODES } from '../types/transport';
import { hasTransitKey } from '../geoapifyFetcher';

export const useUserPreferences = () => {
  const [timeInMinutes, setTimeInMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('timeInMinutes');
      const n = saved ? Number(saved) : NaN;
      // Mapbox plafonne les isochrones à 60 min
      return Number.isInteger(n) && n >= 1 && n <= 60 ? n : 15;
    } catch {
      return 15;
    }
  });

  const [transportMode, setTransportMode] = useState<TransportMode>(() => {
    try {
      const saved = localStorage.getItem('transportMode');
      // « transit » mémorisé alors que la clé Geoapify n'est plus fournie : retour à la marche
      const allowed = new Set<string>(TRANSPORT_MODES.filter((mode) => mode !== 'transit' || hasTransitKey));
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
