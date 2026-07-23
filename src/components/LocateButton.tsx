import { useEffect, useRef, useState } from 'react';
import { Circle, CircleMarker, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { colors } from '../design-system/tokens';

/**
 * Bouton « Ma position » : centre la carte sur la position de l'utilisateur
 * et affiche un point avec le cercle de précision.
 */
const LocateButton: React.FC = () => {
  const map = useMap();
  const { t } = useTranslation();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'locating' | 'error'>('idle');
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Empêche les clics/scrolls sur le bouton d'être interprétés par la carte
  useEffect(() => {
    const el = buttonRef.current;
    if (el) {
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    }
  }, []);

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(p);
        setAccuracy(pos.coords.accuracy);
        setStatus('idle');
        map.flyTo(p, Math.max(map.getZoom(), 12), { duration: 0.75 });
      },
      () => setStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const label = status === 'locating' ? t('map.locating') : status === 'error' ? t('map.locateError') : t('map.locate');

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={locate}
        title={label}
        aria-label={label}
        disabled={status === 'locating'}
        style={{
          position: 'absolute',
          top: 80,
          left: 10,
          zIndex: 1000,
          width: 34,
          height: 34,
          background: status === 'error' ? '#fdecea' : '#fff',
          border: '2px solid rgba(0,0,0,0.2)',
          borderRadius: 4,
          cursor: status === 'locating' ? 'wait' : 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
        }}
      >
        {status === 'locating' ? '…' : '📍'}
      </button>

      {position && (
        <>
          {accuracy > 0 && (
            <Circle
              center={position}
              radius={accuracy}
              pathOptions={{ color: colors.primary, weight: 1, fillColor: colors.primary, fillOpacity: 0.08 }}
            />
          )}
          <CircleMarker
            center={position}
            radius={7}
            pathOptions={{ color: '#fff', weight: 2, fillColor: colors.primary, fillOpacity: 1 }}
          />
        </>
      )}
    </>
  );
};

export default LocateButton;
