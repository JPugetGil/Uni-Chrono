import { useTranslation } from 'react-i18next';
import { Bike, Car, Footprints, TramFront } from 'lucide-react';
import SegmentedControl, { SegmentedOption } from '../design-system/SegmentedControl';
import { TransportMode, TRANSPORT_MODES } from '../types/transport';
import { isModeAvailable } from '../isochroneProvider';

/** Durées proposées (min), jusqu'à une heure */
const DURATIONS = [5, 10, 15, 20, 30, 45, 60];

const MODE_ICONS: Record<TransportMode, React.ReactNode> = {
  walking: <Footprints aria-hidden className="size-5" />,
  cycling: <Bike aria-hidden className="size-5" />,
  driving: <Car aria-hidden className="size-5" />,
  transit: <TramFront aria-hidden className="size-5" />,
};

interface TravelSettingsProps {
  timeInMinutes: number;
  onTimeChange: (value: number) => void;
  transportMode: TransportMode;
  onTransportModeChange: (value: TransportMode) => void;
}

/**
 * Mode de transport et durée : choix directs (pas de saisie libre). La zone
 * est recalculée une fois le choix arrêté (useZone), puis gardée en cache.
 */
const TravelSettings: React.FC<TravelSettingsProps> = ({
  timeInMinutes,
  onTimeChange,
  transportMode,
  onTransportModeChange,
}) => {
  const { t } = useTranslation();

  const modeOptions: SegmentedOption<TransportMode>[] = TRANSPORT_MODES
    .filter(isModeAvailable)
    .map((mode) => ({
      value: mode,
      icon: MODE_ICONS[mode],
      label: mode === 'transit' ? t('transport.transitShort') : t(`transport.${mode}`),
      ariaLabel: t(`transport.${mode}`),
    }));

  // Une durée enregistrée hors des choix proposés reste sélectionnable
  const durations = DURATIONS.includes(timeInMinutes)
    ? DURATIONS
    : [...DURATIONS, timeInMinutes].sort((a, b) => a - b);
  const durationOptions: SegmentedOption<number>[] = durations.map((m) => ({
    value: m,
    label: m,
    ariaLabel: t('travel.minutesLong', { count: m }),
  }));

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        legend={t('travel.mode')}
        value={transportMode}
        options={modeOptions}
        onChange={onTransportModeChange}
      />
      <SegmentedControl
        legend={`${t('travel.duration')} (min)`}
        value={timeInMinutes}
        options={durationOptions}
        onChange={onTimeChange}
        size="sm"
      />
      {transportMode === 'transit' && (
        <p className="text-xs text-slate-600">{t('transport.transitHint')}</p>
      )}
    </div>
  );
};

export default TravelSettings;
