import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { Etablissement } from '../types/etablissement';
import { Isochrone } from '../types/isochrone';

interface MapCenterOnSelectionProps {
  etab: Etablissement | null;
  isochrones: Isochrone[];
}

const MapCenterOnSelection: React.FC<MapCenterOnSelectionProps> = ({ etab, isochrones }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!etab) return;
    const { lat, lon } = etab.coordonnees;

    // Find the isochrone for this etablissement
    const etabId = etab.uai || `${lat},${lon}`;
    const iso = isochrones.find(i => i.etablissementId === etabId);

    if (iso && iso.coordinates.length > 0) {
      const lats = iso.coordinates.map(coord => coord[0]);
      const lngs = iso.coordinates.map(coord => coord[1]);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      ];
      try {
        map.flyToBounds(bounds, { padding: [20, 20], duration: 0.75 });
      } catch {
        // fallback
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    } else {
      // No isochrone available, center on coordinates
      try {
        map.flyTo([lat, lon], map.getZoom(), { duration: 0.75 });
      } catch {
        map.setView([lat, lon], map.getZoom());
      }
    }
  }, [etab, isochrones, map]);
  
  return null;
};

export default MapCenterOnSelection;
