import { useMemo } from 'react';
import { Polygon } from 'react-leaflet';
import { BAND_FILL_OPACITY, Coordinate, Isochrone } from '../types/isochrone';
import { Etablissement } from '../types/etablissement';
import { ensureCounterClockwise, isMultiPolygon } from '../utils/geo';
import { colors } from '../design-system/tokens';
import { Filters, etabId, matchesFilters } from '../utils/filters';

interface IsochronePolygonsProps {
  isochrones: Isochrone[];
  etablissements: Etablissement[];
  filters: Filters;
  hoveredEtabId: string | null;
  selectedEtabId: string | null;
  /** Zone depuis le point de départ : remplace la vue d'ensemble */
  originIsochrone?: Isochrone | null;
  /** Zones des favoris comparés, chacune dans sa couleur */
  compareZones?: Isochrone[];
}

/** Isochrone mise en avant : bandes de temps superposées, la plus lointaine en trait plein */
const FocusedIsochrone: React.FC<{ isochrone: Isochrone; selected: boolean }> = ({ isochrone, selected }) => {
  const bands = isochrone.bands && isochrone.bands.length > 1 ? isochrone.bands : null;
  if (!bands) {
    return (
      <Polygon
        positions={isochrone.coordinates}
        interactive={false}
        pathOptions={{
          color: isochrone.color,
          weight: selected ? 4 : 3,
          opacity: 1,
          fillColor: isochrone.color,
          fillOpacity: selected ? 0.3 : 0.2,
        }}
      />
    );
  }
  // De la plus lointaine à la plus proche : les remplissages s'additionnent vers le centre
  return (
    <>
      {[...bands].reverse().map((band, i) => {
        const outer = i === 0;
        return (
          <Polygon
            key={`${isochrone.etablissementId}-${band.minutes}`}
            positions={band.coordinates}
            interactive={false}
            pathOptions={{
              color: isochrone.color,
              weight: outer ? (selected ? 3 : 2.5) : 1.5,
              opacity: outer ? 1 : 0.85,
              dashArray: outer ? undefined : '5 5',
              fillColor: isochrone.color,
              fillOpacity: BAND_FILL_OPACITY,
            }}
          />
        );
      })}
    </>
  );
};

const IsochronePolygons: React.FC<IsochronePolygonsProps> = ({
  isochrones,
  etablissements,
  filters,
  hoveredEtabId,
  selectedEtabId,
  originIsochrone,
  compareZones,
}) => {
  const byId = useMemo(() => new Map(etablissements.map((e) => [etabId(e), e])), [etablissements]);

  // Priorité à la sélection : seule son isochrone est montrée (rien pendant le calcul)
  if (selectedEtabId) {
    const selected = isochrones.find((iso) => iso.etablissementId === selectedEtabId);
    return selected ? <FocusedIsochrone isochrone={selected} selected /> : null;
  }

  if (compareZones && compareZones.length > 0) {
    return (
      <>
        {compareZones.map((zone) => (
          <Polygon
            key={zone.etablissementId}
            positions={zone.coordinates}
            interactive={false}
            pathOptions={{ color: zone.color, weight: 2.5, opacity: 1, fillColor: zone.color, fillOpacity: 0.12 }}
          />
        ))}
      </>
    );
  }

  // Survol d'un établissement dont la zone est calculée ; sinon la vue d'ensemble reste affichée
  const hovered = hoveredEtabId ? isochrones.find((iso) => iso.etablissementId === hoveredEtabId) : undefined;
  if (hovered) return <FocusedIsochrone isochrone={hovered} selected={false} />;

  if (originIsochrone) return <FocusedIsochrone isochrone={originIsochrone} selected />;

  // Vue d'ensemble : un seul chemin « union » de tous les anneaux avec fillRule
  // 'nonzero' — les recouvrements ne s'empilent pas, la carte reste lisible
  // quel que soit le nombre d'isochrones calculées.
  const rings: Coordinate[][] = [];
  for (const iso of isochrones) {
    const e = iso.etablissementId ? byId.get(iso.etablissementId) : undefined;
    if (!e || !matchesFilters(e, filters)) continue;
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
      interactive={false}
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
};

export default IsochronePolygons;
