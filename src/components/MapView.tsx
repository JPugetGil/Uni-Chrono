import { useMemo, useState } from 'react';
import { MapContainer, ScaleControl, TileLayer, ZoomControl, useMapEvents } from "react-leaflet";
import { Etablissement } from '../types/etablissement';
import { Isochrone } from '../types/isochrone';
import { TransportMode } from '../types/transport';
import { Place } from '../geocodingFetcher';
import { Filters, etabId } from '../utils/filters';
import EtablissementMarkers from './EtablissementMarkers';
import IsochronePolygons from './IsochronePolygons';
import MapFocus, { FocusTarget, MapInsets } from './MapFocus';
import MapResizeHandler from './MapResizeHandler';
import LocateButton from './LocateButton';
import IsochroneComputeButton from './IsochroneComputeButton';
import CommuneHighlight from './CommuneHighlight';
import PlaceMarker from './PlaceMarker';
import LayerSwitcher from './LayerSwitcher';
import CrousMarkers from './CrousMarkers';
import { usePersistentChoice } from '../hooks/usePersistentFlag';
import { BASE_LAYERS, BaseLayer, Overlays } from '../types/layers';

// Fonds de carte : Plan IGN (Géoplateforme, lisible pour la France), ou OpenStreetMap
// (sans sous-domaines a/b/c, déconseillés par la politique d'usage des tuiles OSM)
const PLAN_IGN_URL =
  'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png';
const PLAN_IGN_ATTRIBUTION = '&copy; <a href="https://www.ign.fr/">IGN</a> – Géoplateforme';
const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Surcouches de tuiles adaptées au mode de transport (leaflet-providers).
// 'driving' : pas de surcouche, le fond OSM est déjà centré sur le réseau routier.
const TRANSPORT_OVERLAYS: Partial<Record<TransportMode, { url: string; attribution: string }>> = {
  cycling: {
    url: 'https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png',
    attribution: 'Cycling routes: &copy; <a href="https://cycling.waymarkedtrails.org">Waymarked Trails</a> (CC-BY-SA)',
  },
  transit: {
    url: 'https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
    attribution: 'Rail map: &copy; <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a> (CC-BY-SA)',
  },
};

/** Vue initiale : France métropolitaine, cadrée dans la partie non couverte par les panneaux */
const FRANCE_BOUNDS: [[number, number], [number, number]] = [[41.3, -5.2], [51.1, 9.6]];

/**
 * Clic sur le fond de carte (hors marqueurs et contrôles). Leaflet traite le
 * clic après React : un bouton d'infobulle que React vient de retirer du DOM
 * n'est plus reconnu comme exclu et Leaflet signale un clic sur la carte.
 * Une cible détachée ou située dans une infobulle ou un contrôle est ignorée.
 */
const MapClickHandler: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  useMapEvents({
    click: (e) => {
      const target = e.originalEvent.target as Element | null;
      if (!target?.isConnected || target.closest('.leaflet-popup, .leaflet-control')) return;
      onClick();
    },
  });
  return null;
};

interface MapViewProps {
  /** Tous les établissements (filtrage de la vue d'ensemble des isochrones) */
  etablissements: Etablissement[];
  /** Établissements affichés, après filtres */
  filteredEtablissements: Etablissement[];
  isochrones: Isochrone[];
  /** Zone accessible depuis le point de départ (adresse, position), sans sélection */
  originIsochrone?: Isochrone | null;
  /** Zones des favoris comparés */
  compareZones?: Isochrone[];
  /** Position de l'utilisateur trouvée par le bouton « Ma position » */
  onLocated?: (lat: number, lon: number) => void;
  filters: Filters;
  transportMode: TransportMode;
  hoveredEtabId: string | null;
  selectedEtab: Etablissement | null;
  onHoverEtab: (id: string | null) => void;
  onSelectEtab: (id: string | null) => void;
  /** Calcul à la demande des isochrones ; absent en mode transit */
  onRequestIsochrones?: (etabs: Etablissement[]) => void;
  /** Progression du lot d'isochrones en cours */
  isochronesPending?: number;
  isochronesBatchTotal?: number;
  isochronesBatchFailed?: number;
  focusTarget: FocusTarget | null;
  insets: MapInsets;
  place: Place | null;
  highlightedCommune: string | null;
  /** Boutons de zoom (masqués sur mobile : le pincement suffit) */
  showZoomControl?: boolean;
}

const MapView: React.FC<MapViewProps> = ({
  etablissements,
  filteredEtablissements,
  isochrones,
  originIsochrone,
  compareZones,
  onLocated,
  filters,
  transportMode,
  hoveredEtabId,
  selectedEtab,
  onHoverEtab,
  onSelectEtab,
  onRequestIsochrones,
  isochronesPending = 0,
  isochronesBatchTotal = 0,
  isochronesBatchFailed = 0,
  focusTarget,
  insets,
  place,
  highlightedCommune,
  showZoomControl = true,
}) => {
  const overlay = TRANSPORT_OVERLAYS[transportMode];
  const [baseLayer, setBaseLayer] = usePersistentChoice<BaseLayer>('baseLayer', BASE_LAYERS, 'ign');
  const [overlays, setOverlays] = useState<Overlays>({ crousLogements: false, crousRestaurants: false });
  const selectedEtabId = selectedEtab ? etabId(selectedEtab) : null;
  const selectedIsochrone = selectedEtabId
    ? isochrones.find((iso) => iso.etablissementId === selectedEtabId) ?? null
    : null;
  const computedIds = useMemo(
    () => new Set(isochrones.map((iso) => iso.etablissementId).filter((id): id is string => !!id)),
    [isochrones]
  );

  return (
    <MapContainer
      bounds={FRANCE_BOUNDS}
      boundsOptions={{
        paddingTopLeft: [insets.left + 16, insets.top + 16],
        paddingBottomRight: [insets.right + 16, insets.bottom + 16],
      }}
      minZoom={3}
      maxZoom={19}
      maxBounds={[[-90, -180], [90, 180]]}
      maxBoundsViscosity={1}
      zoomControl={false}
      preferCanvas
      className="absolute inset-0 z-0"
    >
      {baseLayer === 'ign' ? (
        <TileLayer key="ign" url={PLAN_IGN_URL} attribution={PLAN_IGN_ATTRIBUTION} maxZoom={19} noWrap />
      ) : (
        <TileLayer key="osm" url={OSM_URL} attribution={OSM_ATTRIBUTION} maxZoom={19} noWrap />
      )}
      {overlay && (
        <TileLayer
          key={transportMode}
          url={overlay.url}
          attribution={overlay.attribution}
          zIndex={10}
          opacity={0.9}
          maxZoom={19}
          noWrap
        />
      )}

      <IsochronePolygons
        isochrones={isochrones}
        etablissements={etablissements}
        filters={filters}
        hoveredEtabId={hoveredEtabId}
        selectedEtabId={selectedEtabId}
        originIsochrone={originIsochrone}
        compareZones={compareZones}
      />
      <CommuneHighlight code={highlightedCommune} />

      <EtablissementMarkers
        etablissements={filteredEtablissements}
        selected={selectedEtab}
        onHover={onHoverEtab}
        onSelect={onSelectEtab}
      />
      {place && place.kind !== 'position' && <PlaceMarker place={place} />}

      {showZoomControl && <ZoomControl position="topright" />}
      <LocateButton onLocated={onLocated} />
      <LayerSwitcher base={baseLayer} onBaseChange={setBaseLayer} overlays={overlays} onOverlaysChange={setOverlays} />
      <CrousMarkers logements={overlays.crousLogements} restaurants={overlays.crousRestaurants} />
      <ScaleControl position="bottomright" imperial={false} />

      <MapFocus
        selected={selectedEtab}
        selectedIsochrone={selectedIsochrone}
        originIsochrone={originIsochrone}
        compareZones={compareZones}
        target={focusTarget}
        insets={insets}
      />
      <MapResizeHandler />
      <MapClickHandler onClick={() => onSelectEtab(null)} />
      {onRequestIsochrones && (
        <IsochroneComputeButton
          etablissements={filteredEtablissements}
          computedIds={computedIds}
          onRequest={onRequestIsochrones}
          pending={isochronesPending}
          total={isochronesBatchTotal}
          failed={isochronesBatchFailed}
        />
      )}
    </MapContainer>
  );
};

export default MapView;
