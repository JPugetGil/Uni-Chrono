import { useMemo, useState } from 'react';
import { Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import Supercluster from 'supercluster';
import { useTranslation } from 'react-i18next';
import { Etablissement } from '../types/etablissement';
import { etabId } from '../utils/filters';
import { CategoryDot } from './Legend';

interface EtablissementMarkersProps {
  /** Établissements affichés (après filtres) */
  etablissements: Etablissement[];
  /** Établissement sélectionné : toujours affiché, hors regroupement, même s'il est filtré */
  selected: Etablissement | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}

/** Rayon de regroupement en pixels écran */
const CLUSTER_RADIUS = 60;

const iconCache = new Map<string, L.DivIcon>();

const pointIcon = (color: string, selected: boolean): L.DivIcon => {
  const key = `point|${color}|${selected}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const size = selected ? 22 : 16;
    icon = L.divIcon({
      className: 'etab-icon',
      html: `<span class="etab-dot${selected ? ' etab-dot--selected' : ''}" style="background:${color}"></span>`,
      iconSize: [size, size],
    });
    iconCache.set(key, icon);
  }
  return icon;
};

const clusterIcon = (count: number): L.DivIcon => {
  const key = `cluster|${count}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const size = count < 10 ? 30 : count < 100 ? 36 : count < 1000 ? 44 : 52;
    const label = count < 1000 ? String(count) : `${(count / 1000).toFixed(1)}k`;
    icon = L.divIcon({
      className: 'cluster-icon',
      html: `<span class="cluster-dot">${label}</span>`,
      iconSize: [size, size],
    });
    iconCache.set(key, icon);
  }
  return icon;
};

/** Nom accessible du marqueur (un L.divIcon n'a pas d'attribut alt) */
const setAriaLabel = (label: string) => (e: L.LeafletEvent) =>
  (e.target as L.Marker).getElement()?.setAttribute('aria-label', label);

const viewOf = (map: L.Map) => {
  const b = map.getBounds();
  return {
    bbox: [
      Math.max(-180, b.getWest()),
      Math.max(-85, b.getSouth()),
      Math.min(180, b.getEast()),
      Math.min(85, b.getNorth()),
    ] as [number, number, number, number],
    zoom: Math.round(map.getZoom()),
  };
};

/**
 * Marqueurs regroupés (supercluster) : une bulle avec l'effectif par groupe
 * proche, un point coloré par catégorie sinon. Un groupe d'établissements
 * situés au même endroit ouvre la liste au lieu de zoomer.
 */
const EtablissementMarkers: React.FC<EtablissementMarkersProps> = ({ etablissements, selected, onHover, onSelect }) => {
  const { t } = useTranslation();
  const map = useMap();
  const [view, setView] = useState(() => viewOf(map));
  const [openGroup, setOpenGroup] = useState<{ lat: number; lon: number; ids: string[] } | null>(null);
  useMapEvents({ moveend: () => setView(viewOf(map)) });

  const selectedId = selected ? etabId(selected) : null;

  const byId = useMemo(() => new Map(etablissements.map((e) => [etabId(e), e])), [etablissements]);

  const index = useMemo(() => {
    const cluster = new Supercluster<{ id: string }>({ radius: CLUSTER_RADIUS, maxZoom: map.getMaxZoom() });
    cluster.load(
      etablissements
        .filter((e) => etabId(e) !== selectedId)
        .map((e) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [e.coordonnees.lon, e.coordonnees.lat] },
          properties: { id: etabId(e) },
        }))
    );
    return cluster;
  }, [etablissements, selectedId, map]);

  const features = useMemo(() => index.getClusters(view.bbox, view.zoom), [index, view]);

  const openCluster = (clusterId: number, lat: number, lon: number) => {
    const expansionZoom = index.getClusterExpansionZoom(clusterId);
    if (expansionZoom > map.getMaxZoom()) {
      // Établissements au même endroit : impossible de les séparer en zoomant
      setOpenGroup({ lat, lon, ids: index.getLeaves(clusterId, Infinity).map((leaf) => leaf.properties.id) });
    } else {
      map.flyTo([lat, lon], expansionZoom, { duration: 0.5 });
    }
  };

  const renderPoint = (e: Etablissement, isSelected: boolean) => {
    const id = etabId(e);
    const name = e.nom;
    return (
      <Marker
        key={id}
        position={[e.coordonnees.lat, e.coordonnees.lon]}
        icon={pointIcon(e.color || '#898781', isSelected)}
        zIndexOffset={isSelected ? 1000 : 0}
        eventHandlers={{
          add: setAriaLabel(name),
          mouseover: () => onHover(id),
          mouseout: () => onHover(null),
          click: () => onSelect(id),
        }}
      >
        <Tooltip direction="top" offset={[0, -10]}>
          <strong>{name}</strong>
          {e.commune && <div>{e.commune}</div>}
        </Tooltip>
      </Marker>
    );
  };

  return (
    <>
      {features.map((feature) => {
        const [lon, lat] = feature.geometry.coordinates;
        const props = feature.properties;
        if ('cluster_id' in props) {
          const label = t('map.cluster', { count: props.point_count });
          return (
            <Marker
              key={`cluster-${props.cluster_id}`}
              position={[lat, lon]}
              icon={clusterIcon(props.point_count)}
              eventHandlers={{
                add: setAriaLabel(label),
                click: () => openCluster(props.cluster_id, lat, lon),
              }}
            />
          );
        }
        const e = byId.get(props.id);
        return e ? renderPoint(e, false) : null;
      })}

      {selected && renderPoint(selected, true)}

      {openGroup && (
        <Popup
          key={`${openGroup.lat},${openGroup.lon}`}
          position={[openGroup.lat, openGroup.lon]}
          eventHandlers={{ remove: () => setOpenGroup(null) }}
        >
          <p className="m-0! mb-1.5! text-xs font-semibold text-slate-600">
            {t('map.colocated', { count: openGroup.ids.length })}
          </p>
          <ul className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
            {openGroup.ids.map((id) => {
              const e = byId.get(id);
              if (!e) return null;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenGroup(null);
                      onSelect(id);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-100"
                  >
                    <CategoryDot color={e.color || '#898781'} />
                    <span>{e.nom}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Popup>
      )}
    </>
  );
};

export default EtablissementMarkers;
