import { useEffect, useState } from 'react';
import { Polygon } from 'react-leaflet';
import { Coordinate } from '../types/isochrone';
import { fetchCommuneContour } from '../housingFetcher';
import { colors } from '../design-system/tokens';

/** Contour de la commune survolée ou épinglée dans la liste des loyers */
const CommuneHighlight: React.FC<{ code: string | null }> = ({ code }) => {
  const [contour, setContour] = useState<{ code: string; rings: Coordinate[][] } | null>(null);

  useEffect(() => {
    if (!code) return;
    let active = true;
    fetchCommuneContour(code)
      .then((rings) => {
        if (active) setContour({ code, rings });
      })
      .catch(() => {
        // contour indisponible : pas de surbrillance
      });
    return () => {
      active = false;
    };
  }, [code]);

  if (!code || contour?.code !== code) return null;
  return (
    <Polygon
      positions={contour.rings}
      interactive={false}
      pathOptions={{
        color: colors.highlight,
        weight: 2.5,
        dashArray: '6 4',
        fillColor: colors.highlight,
        fillOpacity: 0.08,
      }}
    />
  );
};

export default CommuneHighlight;
