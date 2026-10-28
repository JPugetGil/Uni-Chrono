import { useTranslation } from 'react-i18next';
import { LoaderCircle, TriangleAlert } from 'lucide-react';
import Button from '../design-system/Button';
import { EtablissementsStatus } from '../hooks/useEtablissements';

interface MapStatusProps {
  status: EtablissementsStatus;
  onRetry: () => void;
}

/** Chargement initial des établissements, ou échec avec nouvelle tentative, en haut de la carte */
const MapStatus: React.FC<MapStatusProps> = ({ status, onRetry }) => {
  const { t } = useTranslation();
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

  return (
    <div
      role="status"
      className="map-anchor-top z-[1050] flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm text-slate-800 shadow-lg ring-1 ring-slate-900/10"
    >
      <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin text-blue-700" />
      {t('loading.etablissements')}
    </div>
  );
};

export default MapStatus;
