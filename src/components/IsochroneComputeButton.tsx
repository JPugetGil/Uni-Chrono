import { useEffect, useRef, useState } from 'react';
import { useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { Etablissement } from '../types/etablissement';
import { colors } from '../design-system/tokens';

interface IsochroneComputeButtonProps {
  /** Établissements affichés (après filtres) parmi lesquels chercher les pins visibles */
  etablissements: Etablissement[];
  onRequest: (etabs: Etablissement[]) => void;
  /** Requêtes d'isochrones encore en vol */
  pending: number;
  /** Taille du lot en cours (pour la progression) */
  total: number;
}

/** Diagonale de vue au-delà de laquelle le calcul est bloqué (chargement massif) */
const MAX_VIEW_DIAGONAL_M = 100_000;

const viewTooFar = (map: L.Map): boolean => {
  const bounds = map.getBounds();
  return map.distance(bounds.getSouthWest(), bounds.getNorthEast()) > MAX_VIEW_DIAGONAL_M;
};

const RING_RADIUS = 12;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Bouton carte de calcul des isochrones visibles, à 3 états :
 * ⏱ (prêt) → anneau de progression (calcul) → ✓ pendant 5 s → ⏱.
 * Désactivé si la vue est plus large que 100 km (zoom requis).
 */
const IsochroneComputeButton: React.FC<IsochroneComputeButtonProps> = ({
  etablissements,
  onRequest,
  pending,
  total,
}) => {
  const { t } = useTranslation();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [done, setDone] = useState(false);

  // Transition « en vol → terminé » détectée pendant le rendu (pas d'effet :
  // évite une frame ⏱ parasite entre l'anneau et le ✓)
  const [prevPending, setPrevPending] = useState(pending);
  if (pending !== prevPending) {
    setPrevPending(pending);
    if (prevPending > 0 && pending === 0 && total > 0) setDone(true);
  }

  const map = useMapEvents({
    moveend: () => setTooFar(viewTooFar(map)),
    zoomend: () => setTooFar(viewTooFar(map)),
  });
  const [tooFar, setTooFar] = useState<boolean>(() => viewTooFar(map));

  useEffect(() => {
    const el = buttonRef.current;
    if (el) {
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    }
  }, []);

  // ✓ affiché 5 secondes puis retour à ⏱
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(false), 5000);
    return () => clearTimeout(timer);
  }, [done]);

  const loading = pending > 0;

  const computeVisible = () => {
    if (tooFar || loading) return;
    const bounds = map.getBounds();
    const visible = etablissements.filter(
      (e) =>
        e.coordonnees?.lat != null &&
        e.coordonnees?.lon != null &&
        bounds.contains([e.coordonnees.lat, e.coordonnees.lon])
    );
    if (visible.length > 0) {
      setDone(false);
      onRequest(visible);
    }
  };

  const resolved = total - pending;
  const fraction = total > 0 ? resolved / total : 0;
  const disabled = tooFar && !loading;
  const label = loading
    ? t('map.computing', { done: resolved, total })
    : done
      ? t('map.computeDone')
      : disabled
        ? t('map.computeTooFar')
        : t('map.computeIsochrones');

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={computeVisible}
      title={label}
      aria-label={label}
      disabled={disabled}
      style={{
        position: 'absolute',
        top: 122,
        left: 10,
        zIndex: 1000,
        width: 34,
        height: 34,
        background: '#fff',
        border: '2px solid rgba(0,0,0,0.2)',
        borderRadius: 4,
        cursor: disabled ? 'not-allowed' : loading ? 'progress' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        fontSize: 16,
        lineHeight: 1,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {loading ? (
        <svg width="26" height="26" viewBox="0 0 28 28" role="img" aria-hidden="true">
          <circle cx="14" cy="14" r={RING_RADIUS} fill="none" stroke={colors.border} strokeWidth="3" />
          <circle
            cx="14"
            cy="14"
            r={RING_RADIUS}
            fill="none"
            stroke={colors.primary}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - fraction)}
            transform="rotate(-90 14 14)"
            style={{ transition: 'stroke-dashoffset 300ms ease' }}
          />
        </svg>
      ) : done ? (
        <span style={{ color: colors.success, fontWeight: 700 }}>✓</span>
      ) : (
        '⏱'
      )}
    </button>
  );
};

export default IsochroneComputeButton;
