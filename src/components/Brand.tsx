import { useTranslation } from 'react-i18next';
import { Timer } from 'lucide-react';

/** Nom et promesse de l'application, en tête du panneau */
const Brand: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm">
        <Timer className="size-5" />
      </span>
      <div className="min-w-0">
        <h1 className="text-base leading-tight font-bold text-slate-900">{t('app.name')}</h1>
        <p className="truncate text-xs text-slate-600">{t('app.tagline')}</p>
      </div>
    </div>
  );
};

export default Brand;
