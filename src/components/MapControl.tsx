import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from 'react-leaflet';
import * as L from 'leaflet';

interface MapControlProps {
  position: L.ControlPosition;
  className?: string;
  children: React.ReactNode;
}

/**
 * Contrôle Leaflet dont le contenu est rendu par React : il s'empile avec les
 * contrôles natifs (zoom) dans le coin choisi, et ses clics ne déplacent pas la carte.
 */
const MapControl: React.FC<MapControlProps> = ({ position, className, children }) => {
  const map = useMap();
  const [container] = useState(() => {
    const div = L.DomUtil.create('div', className);
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    return div;
  });

  useEffect(() => {
    const control = new L.Control({ position });
    control.onAdd = () => container;
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map, position, container]);

  return createPortal(children, container);
};

export default MapControl;
