import { Polygon } from 'react-leaflet';
import { Coordinate, Isochrone } from '../types/isochrone';
import { Etablissement, getEtablissementName, getEtablissementTypes } from '../types/etablissement';
import { ensureCounterClockwise, isMultiPolygon } from '../utils/geo';
import { colors } from '../design-system/tokens';
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

  // Vue d'ensemble (ni survol ni sélection) : un seul chemin « union » de tous
  // les anneaux avec fillRule 'nonzero' — les recouvrements ne s'empilent pas,
  // la carte reste lisible quel que soit le nombre d'isochrones calculées.
  if (!selectedEtabId && !hoveredEtabId) {
    const rings: Coordinate[][] = [];
    for (const iso of filteredIsochrones) {
      if (isMultiPolygon(iso.coordinates)) {
        for (const ring of iso.coordinates) rings.push(ensureCounterClockwise(ring));
      } else {
        rings.push(ensureCounterClockwise(iso.coordinates));
      }
    }
    if (rings.length === 0) return null;
    return (
      <Polygon
        positions={rings}
        pathOptions={{
          color: colors.primary,
          weight: 1.5,
          opacity: 0.5,
          fillColor: colors.primary,
          fillOpacity: 0.2,
          fillRule: 'nonzero',
        }}
      />
    );
  }

  // Survol ou sélection : isochrone individuelle mise en avant (couleur de l'établissement)
  return (
    <>
      {filteredIsochrones.map((isochrone: Isochrone, index: number) => {
        const isSelected = !!selectedEtabId && isochrone.etablissementId === selectedEtabId;
        return (
          <Polygon
            key={`${isochrone.etablissementId || index}`}
            positions={isochrone.coordinates}
            pathOptions={{
              color: isochrone.color,
              weight: isSelected ? 5 : 3,
              opacity: isSelected ? 1 : 0.95,
              fillOpacity: isSelected ? 0.3 : 0.2,
            }}
          />
        );
      })}
    </>
  );
};

export default IsochronePolygons;
