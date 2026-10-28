import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, X } from 'lucide-react';
import IconButton from '../design-system/IconButton';

/** Durée d'affichage de l'avis */
const NOTICE_MS = 8000;

/** Avis discret en haut de la carte : le fond a changé de lui-même (Plan IGN indisponible) */
const BaseLayerNotice: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(onDismiss, NOTICE_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className="map-anchor-top z-[1050] flex items-center gap-2 rounded-full bg-white py-1 pr-1 pl-4 text-sm text-slate-800 shadow-lg ring-1 ring-slate-900/10"
    >
      <Layers aria-hidden className="size-4 shrink-0 text-slate-600" />
      <span>{t('layers.fallback')}</span>
      <IconButton label={t('layers.fallbackDismiss')} size="sm" onClick={onDismiss}>
        <X aria-hidden className="size-4" />
      </IconButton>
    </div>
  );
};

export default BaseLayerNotice;
