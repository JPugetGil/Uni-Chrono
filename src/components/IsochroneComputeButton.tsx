import { useEffect, useMemo, useRef, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { Check, Timer, TriangleAlert, ZoomIn } from 'lucide-react';
import { Etablissement } from '../types/etablissement';
import { etabId } from '../utils/filters';
import { cx } from '../design-system/cx';
import { focusRing } from '../design-system/Button';

interface IsochroneComputeButtonProps {
  /** Établissements affichés (après filtres) parmi lesquels chercher les visibles */
  etablissements: Etablissement[];
  /** Établissements dont la zone est déjà calculée pour la config courante */
  computedIds: Set<string>;
  onRequest: (etabs: Etablissement[]) => void;
  /** Requêtes d'isochrones encore en vol */
  pending: number;
  /** Taille du lot en cours (pour la progression) */
  total: number;
  /** Requêtes du lot en échec (bilan) */
  failed: number;
}

/** Diagonale de vue au-delà de laquelle le calcul est bloqué (chargement massif) */
const MAX_VIEW_DIAGONAL_M = 100_000;

const viewOf = (map: L.Map) => {
  const bounds = map.getBounds();
  return { bounds, tooFar: map.distance(bounds.getSouthWest(), bounds.getNorthEast()) > MAX_VIEW_DIAGONAL_M };
};

const RING_RADIUS = 9;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Pastille de calcul des zones des établissements visibles. Son libellé dit
 * toujours ce qu'elle fera : nombre de zones à calculer, progression, résultat,
 * ou pourquoi elle est inactive (vue trop large, rien de visible).
 */
const IsochroneComputeButton: React.FC<IsochroneComputeButtonProps> = ({
  etablissements,
  computedIds,
  onRequest,
  pending,
  total,
  failed,
}) => {
  const { t } = useTranslation();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [done, setDone] = useState(false);

  // Transition « en vol → terminé » détectée pendant le rendu (pas d'effet :
  // évite une frame parasite entre la progression et le ✓)
  const [prevPending, setPrevPending] = useState(pending);
  if (pending !== prevPending) {
    setPrevPending(pending);
    if (prevPending > 0 && pending === 0 && total > 0) setDone(true);
  }

  const map = useMap();
  const [view, setView] = useState(() => viewOf(map));
  useMapEvents({ moveend: () => setView(viewOf(map)) });

  const visible = useMemo(
    () => etablissements.filter((e) => view.bounds.contains([e.coordonnees.lat, e.coordonnees.lon])),
    [etablissements, view.bounds]
  );
  const missing = useMemo(() => visible.filter((e) => !computedIds.has(etabId(e))), [visible, computedIds]);

  useEffect(() => {
    const el = buttonRef.current;
    if (el) {
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    }
  }, []);

  // ✓ affiché 5 secondes
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(false), 5000);
    return () => clearTimeout(timer);
  }, [done]);

  const loading = pending > 0;
  const resolved = total - pending;
  const fraction = total > 0 ? resolved / total : 0;

  let icon: React.ReactNode;
  let label: string;
  let disabled = true;
  if (loading) {
    label = t('map.computing', { done: resolved, total });
    icon = (
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
        <circle cx="11" cy="11" r={RING_RADIUS} fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="3" />
        <circle
          cx="11"
          cy="11"
          r={RING_RADIUS}
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - fraction)}
          transform="rotate(-90 11 11)"
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
      </svg>
    );
  } else if (done && failed > 0) {
    label = t('map.computeDonePartial', { done: total - failed, total });
    icon = <TriangleAlert aria-hidden className="size-5 shrink-0 text-amber-600" />;
  } else if (done) {
    label = t('map.computeDone', { count: total });
    icon = <Check aria-hidden className="size-5 shrink-0 text-green-700" />;
  } else if (view.tooFar) {
    label = t('map.computeTooFar');
    icon = <ZoomIn aria-hidden className="size-5 shrink-0" />;
  } else if (visible.length === 0) {
    label = t('map.noneVisible');
  } else if (missing.length === 0) {
    label = t('map.allComputed');
    icon = <Check aria-hidden className="size-5 shrink-0 text-green-700" />;
  } else {
    label = t('map.compute', { count: missing.length });
    icon = <Timer aria-hidden className="size-5 shrink-0" />;
    disabled = false;
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => {
        if (disabled || missing.length === 0) return;
        setDone(false);
        onRequest(missing);
      }}
      aria-disabled={disabled}
      className={cx(
        'map-anchor-bottom z-[1000] flex items-center gap-2 rounded-full px-4 py-2.5 text-left text-sm font-semibold shadow-lg transition-colors',
        focusRing,
        loading || !disabled
          ? 'bg-blue-700 text-white hover:bg-blue-800'
          : 'cursor-default bg-white text-slate-700 ring-1 ring-slate-300',
        loading && 'cursor-progress hover:bg-blue-700'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default IsochroneComputeButton;
