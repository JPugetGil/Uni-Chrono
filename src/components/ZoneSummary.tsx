import { useTranslation } from 'react-i18next';
import { Bike, Car, Footprints, LoaderCircle, TramFront, TriangleAlert } from 'lucide-react';
import Button from '../design-system/Button';
import { Isochrone, bandOpacity } from '../types/isochrone';
import { TransportMode } from '../types/transport';
import { HousingStatus } from '../hooks/useHousing';
import { isochroneAreaKm2 } from '../utils/geo';
import { useFormatters } from '../i18n/useFormatters';

export type ZoneStatus = 'pending' | 'ready' | 'error';

const MODE_ICONS: Record<TransportMode, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  walking: Footprints,
  cycling: Bike,
  driving: Car,
  transit: TramFront,
};

interface ZoneSummaryProps {
  status: ZoneStatus;
  isochrone?: Isochrone | null;
  transportMode: TransportMode;
  timeInMinutes: number;
  /** Communes de la zone et leur loyer médian (€/m²) */
  housingStatus: HousingStatus;
  communesCount: number;
  medianRent?: number;
  surface: number;
  onRetry?: () => void;
}

const Stat: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className="min-w-0">
    <dt className="text-xs text-slate-600">{label}</dt>
    <dd className="text-base font-semibold text-slate-900 tabular-nums">{value}</dd>
    {hint && <dd className="text-xs text-slate-600">{hint}</dd>}
  </div>
);

/** Zone accessible : bandes de temps, surface, communes couvertes, loyer médian. */
const ZoneSummary: React.FC<ZoneSummaryProps> = ({
  status,
  isochrone,
  transportMode,
  timeInMinutes,
  housingStatus,
  communesCount,
  medianRent,
  surface,
  onRetry,
}) => {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const ModeIcon = MODE_ICONS[transportMode];
  const bands = isochrone?.bands?.length ? isochrone.bands.map((b) => b.minutes) : [timeInMinutes];
  const housingReady = housingStatus === 'ready';

  return (
    <section aria-labelledby="zone-title" className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <h3 id="zone-title" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <ModeIcon aria-hidden className="size-4 text-slate-600" />
        {t('zone.headline', { time: timeInMinutes, mode: t(`transport.by_${transportMode}`) })}
      </h3>

      {status === 'pending' && (
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
          <LoaderCircle aria-hidden className="size-4 animate-spin text-blue-700" />
          {t('zone.computing')}
        </p>
      )}

      {status === 'error' && (
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
          <TriangleAlert aria-hidden className="size-4 shrink-0 text-red-700" />
          <span className="flex-1">{t('zone.error')}</span>
          {onRetry && (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              {t('zone.retry')}
            </Button>
          )}
        </div>
      )}

      {status === 'ready' && isochrone && (
        <>
          <ul aria-label={t('zone.bands')} className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-700">
            {bands.map((minutes, i) => (
              <li key={minutes} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="relative h-3 w-5 overflow-hidden rounded-sm"
                  style={{ boxShadow: `inset 0 0 0 1.5px ${isochrone.color}` }}
                >
                  <span
                    className="absolute inset-0"
                    style={{ background: isochrone.color, opacity: bandOpacity(i, bands.length) }}
                  />
                </span>
                {t('zone.bandLabel', { time: minutes })}
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-3 gap-3">
            <Stat label={t('zone.area')} value={t('zone.areaValue', { value: fmt.approx(isochroneAreaKm2(isochrone.coordinates)) })} />
            <Stat label={t('zone.communes')} value={housingReady ? fmt.integer(communesCount) : '—'} />
            <Stat
              label={t('zone.medianRent')}
              value={housingReady && medianRent != null ? t('zone.rentValue', { value: fmt.decimal(medianRent) }) : '—'}
              hint={
                housingReady && medianRent != null
                  ? t('zone.monthlyFor', { amount: fmt.euros(medianRent * surface), surface })
                  : undefined
              }
            />
          </dl>
        </>
      )}
    </section>
  );
};

export default ZoneSummary;
