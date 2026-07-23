import { MapContainer, ScaleControl, TileLayer } from "react-leaflet";
import { Etablissement, getEtablissementName, getEtablissementTypes } from '../types/etablissement';
import { Isochrone } from '../types/isochrone';
import EtablissementMarkers from './EtablissementMarkers';
import IsochronePolygons from './IsochronePolygons';
import MapCenterOnSelection from './MapCenterOnSelection';
import MapResizeHandler from './MapResizeHandler';
import LocateButton from './LocateButton';
import IsochroneComputeButton from './IsochroneComputeButton';
import { Filters } from './FilterPanel';

interface MapViewProps {
  etablissements: Etablissement[];
  isochrones: Isochrone[];
  filters: Filters;
  hoveredEtabId: string | null;
  selectedEtabId: string | null;
  onHoverEtab: (id: string | null) => void;
  onSelectEtab: (id: string | null) => void;
  /** Calcul à la demande des isochrones ; absent en mode transit */
  onRequestIsochrones?: (etabs: Etablissement[]) => void;
  /** Progression du lot d'isochrones en cours (bouton ⏱) */
  isochronesPending?: number;
  isochronesBatchTotal?: number;
}

const MapView: React.FC<MapViewProps> = ({
  etablissements,
  isochrones,
  filters,
  hoveredEtabId,
  selectedEtabId,
  onHoverEtab,
  onSelectEtab,
  onRequestIsochrones,
  isochronesPending = 0,
  isochronesBatchTotal = 0,
}) => {
  // Apply filters to etablissements
  const filteredEtab = etablissements.filter(e => {
    if (filters.type && !getEtablissementTypes(e).includes(filters.type)) return false;
    if (filters.region && e.reg_nom !== filters.region) return false;
    if (filters.departement && e.dep_nom !== filters.departement) return false;
    if (filters.commune && e.com_nom !== filters.commune) return false;
    if (filters.name) {
      const label = getEtablissementName(e).toLowerCase();
      if (!label.includes(filters.name.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <MapContainer
      center={[46.603354, 1.888334]}
      zoom={6}
      minZoom={3}
      maxZoom={19}
      maxBounds={[[-90, -180], [90, 180]]}
      maxBoundsViscosity={1}
      preferCanvas
      style={{ flexGrow: 1 }}
    >
      <EtablissementMarkers
        etablissements={filteredEtab}
        onHover={onHoverEtab}
        onSelect={onSelectEtab}
      />

      <IsochronePolygons
        isochrones={isochrones}
        etablissements={etablissements}
        filters={filters}
        hoveredEtabId={hoveredEtabId}
        selectedEtabId={selectedEtabId}
      />

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
        noWrap
      />

      <MapCenterOnSelection
        etab={selectedEtabId ? etablissements.find(x => (x.uai || `${x.coordonnees.lat},${x.coordonnees.lon}`) === selectedEtabId) || null : null}
        isochrones={isochrones}
      />

      <ScaleControl position="bottomleft" imperial={false} />
      <MapResizeHandler />
      <LocateButton />
      {onRequestIsochrones && (
        <IsochroneComputeButton
          etablissements={filteredEtab}
          onRequest={onRequestIsochrones}
          pending={isochronesPending}
          total={isochronesBatchTotal}
        />
      )}
    </MapContainer>
  );
};

export default MapView;
