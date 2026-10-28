import { Marker, Tooltip } from 'react-leaflet';
import * as L from 'leaflet';
import { Place } from '../geocodingFetcher';

// Repère en forme d'épingle (tracé de l'icône « map-pin » de Lucide)
const placeIcon = L.divIcon({
  className: 'place-icon',
  html: `<svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" fill="#0f172a" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="10" r="3" fill="#fff"/>
  </svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 30],
});

/** Adresse ou lieu choisi dans la recherche */
const PlaceMarker: React.FC<{ place: Place }> = ({ place }) => (
  <Marker position={[place.lat, place.lon]} icon={placeIcon} keyboard={false} zIndexOffset={900}>
    <Tooltip permanent direction="top" offset={[0, -28]}>
      {place.label}
    </Tooltip>
  </Marker>
);

export default PlaceMarker;
