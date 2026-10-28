import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoaderCircle, MapPin, TriangleAlert } from 'lucide-react';
import Button from '../design-system/Button';
import { TransportMode } from '../types/transport';
import { IsochroneErrorKind } from '../isochroneError';
import { ReachableEtablissement } from '../utils/reachable';
import { CategoryDot } from './Legend';

const VISIBLE_ROWS = 10;

interface OriginPanelProps {
  label: string;
  /** Calcul demandé pour ce point */
  active: boolean;
  onActivate: () => void;
  loading: boolean;
  error: IsochroneErrorKind | null;
  provider: string;
  /** Établissements accessibles (null tant que la zone n'est pas calculée) */
  reachable: ReachableEtablissement[] | null;
  reachableOnly: boolean;
  onReachableOnlyChange: (value: boolean) => void;
  timeInMinutes: number;
  transportMode: TransportMode;
  onSelectEtab: (id: string) => void;
}

/** Point de départ (adresse, position) : établissements accessibles depuis ce point */
const OriginPanel: React.FC<OriginPanelProps> = ({
  label,
  active,
  onActivate,
  loading,
  error,
  provider,
  reachable,
  reachableOnly,
  onReachableOnlyChange,
  timeInMinutes,
  transportMode,
  onSelectEtab,
}) => {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const trip = { time: timeInMinutes, mode: t(`transport.by_${transportMode}`) };
  const rows = reachable ? (showAll ? reachable : reachable.slice(0, VISIBLE_ROWS)) : [];

  return (
    <section aria-labelledby="origin-title" className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <h2 id="origin-title" className="flex items-start gap-2 text-sm font-semibold text-slate-900">
        <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-700" />
        <span>{t('origin.title', { label })}</span>
      </h2>

      {!active && (
        <Button size="sm" onClick={onActivate} className="h-auto self-start py-1.5 text-left">
          {t('origin.compute', trip)}
        </Button>
      )}

      {active && loading && (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <LoaderCircle aria-hidden className="size-4 animate-spin text-blue-700" />
          {t('zone.computing')}
        </p>
      )}

      {active && error && (
        <p className="flex items-center gap-2 text-sm text-slate-700">
          <TriangleAlert aria-hidden className="size-4 shrink-0 text-red-700" />
          {t(`zone.errors.${error}`, { provider })}
        </p>
      )}

      {active && reachable && (
        <>
          <p className="text-sm text-slate-700">
            {reachable.length > 0 ? t('origin.count', { count: reachable.length, ...trip }) : t('origin.none', trip)}
          </p>
          {reachable.length > 0 && (
            <>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={reachableOnly}
                  onChange={(e) => onReachableOnlyChange(e.target.checked)}
                  className="size-4 accent-blue-700"
                />
                {t('origin.onlyReachable')}
              </label>
              <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
                {rows.map(({ etablissement: e, minutes }) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onSelectEtab(e.id)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 focus-visible:bg-blue-50 focus-visible:outline-none"
                    >
                      <CategoryDot color={e.color || '#898781'} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-900">{e.nom}</span>
                        {/* Commune et formations : distinguent les sites d'un même établissement */}
                        <span className="block truncate text-xs text-slate-500">
                          {[e.commune, e.types.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      {minutes > 0 && (
                        <span className="text-xs whitespace-nowrap text-slate-600">{t('zone.bandLabel', { time: minutes })}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {reachable.length > VISIBLE_ROWS && (
                <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)} className="self-start">
                  {showAll ? t('housing.showLess') : t('origin.showAll', { count: reachable.length })}
                </Button>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
};

export default OriginPanel;
