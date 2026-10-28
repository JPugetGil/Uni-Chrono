import { useMemo, useState } from 'react';
import { Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { useCrous } from '../hooks/useCrous';
import { colors } from '../design-system/tokens';

/** En dessous de ce zoom (vue régionale), les ~1 800 lieux CROUS encombreraient la carte */
export const CROUS_MIN_ZOOM = 9;

// Tracés des icônes « house » et « utensils » de Lucide
const HOUSE_PATHS =
  '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>';
const UTENSILS_PATHS =
  '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>';

const crousIcon = (paths: string, background: string, muted = false) =>
  L.divIcon({
    className: 'crous-icon',
    html: `<span class="crous-dot${muted ? ' crous-dot--muted' : ''}" style="background:${background}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg></span>`,
    iconSize: [22, 22],
  });

const ICONS = {
  logement: crousIcon(HOUSE_PATHS, colors.crousLogement),
  restaurant: crousIcon(UTENSILS_PATHS, colors.crousRestaurant),
  restaurantFerme: crousIcon(UTENSILS_PATHS, colors.crousRestaurant, true),
};

const setAriaLabel = (label: string) => (e: L.LeafletEvent) =>
  (e.target as L.Marker).getElement()?.setAttribute('aria-label', label);

interface CrousMarkersProps {
  logements: boolean;
  restaurants: boolean;
}

/** Résidences et restaurants CROUS de la vue, à partir du zoom régional */
const CrousMarkers: React.FC<CrousMarkersProps> = ({ logements, restaurants }) => {
  const { t } = useTranslation();
  const map = useMap();
  const data = useCrous(logements || restaurants);
  const [bounds, setBounds] = useState(() => map.getBounds());
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({
    moveend: () => {
      setBounds(map.getBounds());
      setZoom(map.getZoom());
    },
  });

  const visible = useMemo(() => {
    if (!data || zoom < CROUS_MIN_ZOOM) return { logements: [], restaurants: [] };
    const inView = (p: { lat: number; lon: number }) => bounds.contains([p.lat, p.lon]);
    return {
      logements: logements ? data.logements.filter(inView) : [],
      restaurants: restaurants ? data.restaurants.filter(inView) : [],
    };
  }, [data, zoom, bounds, logements, restaurants]);

  return (
    <>
      {visible.logements.map((l) => (
        <Marker
          key={`l-${l.id}`}
          position={[l.lat, l.lon]}
          icon={ICONS.logement}
          eventHandlers={{ add: setAriaLabel(`${t('crous.logement')} : ${l.nom}`) }}
        >
          <Tooltip direction="top" offset={[0, -10]}>
            <strong>{l.nom}</strong>
            <div>{t('crous.logement')}</div>
          </Tooltip>
          <Popup>
            <p className="m-0! font-semibold text-slate-900">{l.nom}</p>
            <p className="m-0! text-xs text-slate-600">{l.adresse ?? l.ville}</p>
            {l.description && <p className="mt-1! mb-0! text-xs text-slate-700">{l.description}</p>}
            {l.url && (
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-medium">
                {t('crous.book')} ↗
              </a>
            )}
          </Popup>
        </Marker>
      ))}
      {visible.restaurants.map((r) => (
        <Marker
          key={`r-${r.id}`}
          position={[r.lat, r.lon]}
          icon={r.ferme ? ICONS.restaurantFerme : ICONS.restaurant}
          eventHandlers={{ add: setAriaLabel(`${r.type} : ${r.nom}`) }}
        >
          <Tooltip direction="top" offset={[0, -10]}>
            <strong>{r.nom}</strong>
            <div>
              {r.type}
              {r.ferme && ` · ${t('crous.closed')}`}
            </div>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
};

export default CrousMarkers;
