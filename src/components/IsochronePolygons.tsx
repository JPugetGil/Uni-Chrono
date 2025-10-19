import { Polygon } from 'react-leaflet';
import { Isochrone } from '../types/isochrone';
import { Etablissement } from '../types/etablissement';
import { Filters } from './FilterPanel';

interface IsochronePolygonsProps {
  isochrones: Isochrone[];
  etablissements: Etablissement[];
  filters: Filters;
  hoveredEtabId: string | null;
  selectedEtabId: string | null;
}

const IsochronePolygons: React.FC<IsochronePolygonsProps> = ({
  isochrones,
  etablissements,
  filters,
  hoveredEtabId,
  selectedEtabId,
}) => {
  const filteredIsochrones = isochrones.filter((iso) => {
    // Priorité à la sélection: ne montrer que l'isochrone sélectionné
    if (selectedEtabId) return iso.etablissementId === selectedEtabId;
    // Sinon, si hover actif: ne montrer que celui en hover
    if (hoveredEtabId) return iso.etablissementId === hoveredEtabId;
    // Sinon: appliquer les filtres usuels
    if (!etablissements || !iso.etablissementId) return true;
    const e = etablissements.find(x => (x.uai || `${x.coordonnees.lat},${x.coordonnees.lon}`) === iso.etablissementId);
    if (!e) return false;
    if (filters.type && !(e.type_d_etablissement || []).includes(filters.type)) return false;
    if (filters.region && e.reg_nom !== filters.region) return false;
    if (filters.departement && e.dep_nom !== filters.departement) return false;
    if (filters.commune && e.com_nom !== filters.commune) return false;
    if (filters.name && !e.uo_lib?.toLowerCase().includes(filters.name.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {filteredIsochrones.map((isochrone: Isochrone, index: number) => {
        const isSelected = !!selectedEtabId && isochrone.etablissementId === selectedEtabId;
        const isHovered = !isSelected && !!hoveredEtabId && isochrone.etablissementId === hoveredEtabId;
        return (
          <Polygon
            key={`${isochrone.etablissementId || index}`}
            positions={isochrone.coordinates}
            color={isochrone.color}
            pathOptions={{
              color: isochrone.color,
              weight: isSelected ? 5 : isHovered ? 3 : 1.5,
              opacity: isSelected ? 1 : isHovered ? 0.95 : 0.85,
              fillOpacity: isSelected ? 0.3 : isHovered ? 0.2 : 0.12,
            }}
          />
        );
      })}
    </>
  );
};

export default IsochronePolygons;
