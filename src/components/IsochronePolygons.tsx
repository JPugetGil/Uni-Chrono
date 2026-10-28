import { Polygon } from 'react-leaflet';
import { BAND_FILL_OPACITY, Coordinate, Isochrone, bandColor } from '../types/isochrone';
import { isMultiPolygon } from '../utils/geo';

interface IsochronePolygonsProps {
  /** Établissement sélectionné : seule sa zone est montrée (rien pendant le calcul) */
  selected: boolean;
  selectedIsochrone: Isochrone | null;
  /** Zone depuis le point de départ (adresse, position) */
  originIsochrone?: Isochrone | null;
  /** Zones des favoris comparés, chacune dans sa couleur */
  compareZones?: Isochrone[];
}

const ringsOf = (coordinates: Coordinate[] | Coordinate[][]): Coordinate[][] =>
  isMultiPolygon(coordinates) ? coordinates : [coordinates];

/**
 * Isochrone mise en avant : une couleur par bande de temps (bandColors). Chaque
 * bande est un anneau, privé de la bande précédente par la règle pair-impair :
 * les couleurs ne se mélangent pas. Contours par-dessus, le plus lointain épais.
 */
const FocusedIsochrone: React.FC<{ isochrone: Isochrone }> = ({ isochrone }) => {
  const bands = isochrone.bands?.length ? isochrone.bands : [{ minutes: 0, coordinates: isochrone.coordinates }];
  const last = bands.length - 1;
  return (
    <>
      {bands.map((band, i) => (
        <Polygon
          key={`fill-${band.minutes}`}
          positions={[...ringsOf(band.coordinates), ...(i > 0 ? ringsOf(bands[i - 1].coordinates) : [])]}
          interactive={false}
          pathOptions={{
            stroke: false,
            fillColor: bandColor(i, bands.length).fill,
            fillOpacity: BAND_FILL_OPACITY,
            fillRule: 'evenodd',
          }}
        />
      ))}
      {bands
        .map((band, i) => (
          <Polygon
            key={`line-${band.minutes}`}
            positions={ringsOf(band.coordinates)}
            interactive={false}
            pathOptions={{ color: bandColor(i, bands.length).line, weight: i === last ? 3 : 1.5, opacity: 1, fill: false }}
          />
        ))
        .reverse()}
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
