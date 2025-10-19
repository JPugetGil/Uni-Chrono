import { MapContainer, TileLayer } from "react-leaflet";
import { Etablissement, getEtablissementName, getEtablissementTypes } from '../types/etablissement';
import { Isochrone } from '../types/isochrone';
import EtablissementMarkers from './EtablissementMarkers';
import IsochronePolygons from './IsochronePolygons';
import MapCenterOnSelection from './MapCenterOnSelection';
import { Filters } from './FilterPanel';

interface MapViewProps {
  etablissements: Etablissement[];
  isochrones: Isochrone[];
  filters: Filters;
  hoveredEtabId: string | null;
  selectedEtabId: string | null;
  onHoverEtab: (id: string | null) => void;
  onSelectEtab: (id: string | null) => void;
}

const MapView: React.FC<MapViewProps> = ({
  etablissements,
  isochrones,
  filters,
  hoveredEtabId,
  selectedEtabId,
  onHoverEtab,
  onSelectEtab,
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
      />

      <MapCenterOnSelection
        etab={selectedEtabId ? etablissements.find(x => (x.uai || `${x.coordonnees.lat},${x.coordonnees.lon}`) === selectedEtabId) || null : null}
        isochrones={isochrones}
      />
    </MapContainer>
  );
};

export default MapView;
