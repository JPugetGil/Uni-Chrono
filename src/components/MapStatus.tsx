import { useTranslation } from 'react-i18next';
import { LoaderCircle, TriangleAlert } from 'lucide-react';
import Button from '../design-system/Button';
import { EtablissementsStatus } from '../hooks/useEtablissements';
import { useFormatters } from '../i18n/useFormatters';

interface MapStatusProps {
  status: EtablissementsStatus;
  loaded: number;
  total: number;
  onRetry: () => void;
}

/** Chargement initial des établissements (progression) ou échec (nouvelle tentative), en haut de la carte */
const MapStatus: React.FC<MapStatusProps> = ({ status, loaded, total, onRetry }) => {
  const { t } = useTranslation();
  const fmt = useFormatters();
  if (status === 'ready') return null;

  if (status === 'error') {
    return (
      <div
        role="alert"
        className="map-anchor-top z-[1050] flex items-center gap-3 rounded-2xl bg-white py-2 pr-2 pl-4 text-sm text-slate-800 shadow-lg ring-1 ring-red-200"
      >
        <TriangleAlert aria-hidden className="size-5 shrink-0 text-red-700" />
        <span>{t('loading.error')}</span>
        <Button size="sm" onClick={onRetry}>
          {t('loading.retry')}
        </Button>
      </div>
    );
  }

  const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
  return (
    <div
      role="status"
      className="map-anchor-top z-[1050] w-[22rem] rounded-2xl max-md:mr-14 max-md:ml-3 max-md:w-auto bg-white px-4 py-2.5 text-sm text-slate-800 shadow-lg ring-1 ring-slate-900/10"
    >
      <div className="flex items-center gap-2">
        <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin text-blue-700" />
        <span className="flex-1 truncate">{t('loading.etablissements')}</span>
        {total > 0 && (
          <span className="text-xs text-slate-500 tabular-nums">
            {fmt.integer(loaded)} / {fmt.integer(total)}
          </span>
        )}
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label={t('loading.etablissements')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-blue-700 transition-[width] duration-300" style={{ width: `${Math.max(4, percent)}%` }} />
      </div>
    </div>
  );
};

export default MapStatus;
