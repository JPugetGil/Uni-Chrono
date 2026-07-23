import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Force Leaflet à recalculer sa taille quand le conteneur change
 * (ex. quand l'en-tête est replié pour agrandir la carte).
 */
const MapResizeHandler: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
};

export default MapResizeHandler;
