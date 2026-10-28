import { useState } from 'react';
import { Circle, CircleMarker, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { LoaderCircle, LocateFixed } from 'lucide-react';
import { colors } from '../design-system/tokens';
import { cx } from '../design-system/cx';
import { focusRing } from '../design-system/Button';
import MapControl from './MapControl';

/**
 * Bouton « Ma position » : centre la carte sur la position de l'utilisateur
 * et affiche un point avec le cercle de précision.
 */
const LocateButton: React.FC<{ onLocated?: (lat: number, lon: number) => void }> = ({ onLocated }) => {
  const map = useMap();
  const { t } = useTranslation();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'locating' | 'error'>('idle');

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
        // La position devient le point de départ (l'app cadre la carte), sinon on s'y déplace
        if (onLocated) onLocated(p[0], p[1]);
        else map.flyTo(p, Math.max(map.getZoom(), 12), { duration: 0.75 });
      },
      () => setStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const label = status === 'locating' ? t('map.locating') : status === 'error' ? t('map.locateError') : t('map.locate');

  return (
    <>
      <MapControl position="topright" className="leaflet-bar">
        <button
          type="button"
          onClick={locate}
          title={label}
          aria-label={label}
          disabled={status === 'locating'}
          className={cx(
            'flex size-[30px] items-center justify-center rounded-[4px] bg-white hover:bg-slate-50',
            focusRing,
            status === 'error' ? 'text-red-700' : 'text-slate-800',
            status === 'locating' && 'cursor-wait'
          )}
        >
          {status === 'locating' ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : (
            <LocateFixed aria-hidden className="size-4" />
          )}
        </button>
      </MapControl>

      {position && (
        <>
          {accuracy > 0 && (
            <Circle
              center={position}
              radius={accuracy}
              interactive={false}
              pathOptions={{ color: colors.primary, weight: 1, fillColor: colors.primary, fillOpacity: 0.08 }}
            />
          )}
          <CircleMarker
            center={position}
            radius={7}
            interactive={false}
            pathOptions={{ color: '#fff', weight: 2, fillColor: colors.primary, fillOpacity: 1 }}
          />
        </>
      )}
    </>
  );
};

export default LocateButton;
