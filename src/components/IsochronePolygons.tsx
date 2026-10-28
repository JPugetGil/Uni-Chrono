import { Polygon } from 'react-leaflet';
import { BAND_FILL_OPACITY, Isochrone } from '../types/isochrone';

interface IsochronePolygonsProps {
  /** Établissement sélectionné : seule sa zone est montrée (rien pendant le calcul) */
  selected: boolean;
  selectedIsochrone: Isochrone | null;
  /** Zone depuis le point de départ (adresse, position) */
  originIsochrone?: Isochrone | null;
  /** Zones des favoris comparés, chacune dans sa couleur */
  compareZones?: Isochrone[];
}

/** Isochrone mise en avant : bandes de temps superposées, la plus lointaine en trait plein */
const FocusedIsochrone: React.FC<{ isochrone: Isochrone }> = ({ isochrone }) => {
  const bands = isochrone.bands && isochrone.bands.length > 1 ? isochrone.bands : null;
  if (!bands) {
    return (
      <Polygon
        positions={isochrone.coordinates}
        interactive={false}
        pathOptions={{ color: isochrone.color, weight: 4, opacity: 1, fillColor: isochrone.color, fillOpacity: 0.3 }}
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
              weight: outer ? 3 : 1.5,
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

/** Zone affichée : celle de l'établissement sélectionné, sinon la comparaison, sinon le point de départ */
const IsochronePolygons: React.FC<IsochronePolygonsProps> = ({ selected, selectedIsochrone, originIsochrone, compareZones }) => {
  if (selected) return selectedIsochrone ? <FocusedIsochrone isochrone={selectedIsochrone} /> : null;

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

  return originIsochrone ? <FocusedIsochrone isochrone={originIsochrone} /> : null;
};

export default IsochronePolygons;
