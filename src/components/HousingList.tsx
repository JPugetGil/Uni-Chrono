import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import Button from '../design-system/Button';
import SegmentedControl from '../design-system/SegmentedControl';
import { cx } from '../design-system/cx';
import { HousingStatus } from '../hooks/useHousing';
import { HousingCommune } from '../utils/housing';
import { useFormatters } from '../i18n/useFormatters';
import { useDataMeta } from '../hooks/useDataMeta';

/** Surfaces proposées pour l'estimation mensuelle : studio, T1, T2 */
const HOUSING_SURFACES = [20, 30, 45];

const VISIBLE_ROWS = 8;

interface HousingListProps {
  status: HousingStatus;
  items: HousingCommune[];
  surface: number;
  onSurfaceChange: (surface: number) => void;
  /** Commune épinglée (clic) : son contour reste affiché sur la carte */
  pinnedCommune: string | null;
  onPinCommune: (code: string | null) => void;
  /** Commune survolée ou focalisée : contour affiché temporairement */
  onHoverCommune: (code: string | null) => void;
}

/** Communes de la zone, des moins chères aux plus chères, avec loyer mensuel estimé. */
const HousingList: React.FC<HousingListProps> = ({
  status,
  items,
  surface,
  onSurfaceChange,
  pinnedCommune,
  onPinCommune,
  onHoverCommune,
}) => {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const rentsYear = useDataMeta()?.rents.year;
  const [showAll, setShowAll] = useState(false);

  if (status === 'idle') return null;

  const rows = showAll ? items : items.slice(0, VISIBLE_ROWS);

  return (
    <section aria-labelledby="housing-title" className="flex flex-col gap-3">
      <h3 id="housing-title" className="text-sm font-semibold text-slate-900">
        {t('housing.title')}
      </h3>

      {status === 'loading' && <p className="text-sm text-slate-600">{t('housing.loading')}</p>}
      {status === 'error' && <p className="text-sm text-slate-600">{t('housing.error')}</p>}
      {status === 'ready' && items.length === 0 && <p className="text-sm text-slate-600">{t('housing.empty')}</p>}

      {status === 'ready' && items.length > 0 && (
        <>
          <SegmentedControl
            legend={t('housing.surface')}
            value={surface}
            options={HOUSING_SURFACES.map((s) => ({ value: s, label: t('housing.surfaceOption', { surface: s }) }))}
            onChange={onSurfaceChange}
            size="sm"
          />
          <p className="text-xs text-slate-600">{t('housing.count', { count: items.length })}</p>
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl ring-1 ring-slate-200">
            {rows.map((c) => {
              const pinned = pinnedCommune === c.code;
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    aria-pressed={pinned}
                    title={t('housing.showOnMap', { name: c.nom })}
                    onClick={() => onPinCommune(pinned ? null : c.code)}
                    onMouseEnter={() => onHoverCommune(c.code)}
                    onMouseLeave={() => onHoverCommune(null)}
                    onFocus={() => onHoverCommune(c.code)}
                    onBlur={() => onHoverCommune(null)}
                    className={cx(
                      'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50',
                      'focus-visible:bg-blue-50 focus-visible:outline-none',
                      pinned && 'bg-blue-50'
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-sm font-medium text-slate-900">
                        <span className="truncate">{c.nom}</span>
                        {pinned && <MapPin aria-hidden className="size-3.5 shrink-0 text-blue-800" />}
                      </span>
                      {c.population > 0 && (
                        <span className="block text-xs text-slate-500">
                          {t('housing.population', { value: fmt.integer(c.population) })}
                        </span>
                      )}
                    </span>
                    {c.rent != null ? (
                      <span className="text-right tabular-nums">
                        <span className="block text-sm font-semibold text-slate-900">
                          {t('housing.monthly', { amount: fmt.euros(c.rent * surface) })}
                        </span>
                        <span className="block text-xs text-slate-600">
                          {t('housing.perM2', { rent: fmt.decimal(c.rent) })}
                        </span>
                        {c.rentLow != null && c.rentHigh != null && (
                          <span className="block text-[11px] text-slate-500">
                            {t('housing.range', { low: fmt.decimal(c.rentLow), high: fmt.decimal(c.rentHigh) })}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">{t('housing.noRent')}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {items.length > VISIBLE_ROWS && (
            <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)} className="self-start">
              {showAll ? t('housing.showLess') : t('housing.showAll', { count: items.length })}
            </Button>
          )}
          <p className="text-xs text-slate-500">{t('housing.source', { year: rentsYear ?? '' })}</p>
        </>
      )}
    </section>
  );
};

export default HousingList;
