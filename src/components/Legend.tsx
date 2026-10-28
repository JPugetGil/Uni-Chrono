import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Etablissement, ETABLISSEMENT_CATEGORIES } from '../types/etablissement';
import { categoryColors } from '../design-system/tokens';
import { useFormatters } from '../i18n/useFormatters';

interface LegendProps {
  /** Établissements affichés (après filtres) : effectif par catégorie */
  etablissements: Etablissement[];
}

/** Pastille identique au marqueur de la carte */
export const CategoryDot: React.FC<{ color: string; className?: string }> = ({ color, className }) => (
  <span
    aria-hidden
    className={`inline-block size-3.5 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(15_23_42/0.35)] ${className ?? ''}`}
    style={{ background: color }}
  />
);

const Legend: React.FC<LegendProps> = ({ etablissements }) => {
  const { t } = useTranslation();
  const fmt = useFormatters();

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of etablissements) {
      c.set(e.category, (c.get(e.category) ?? 0) + 1);
    }
    return c;
  }, [etablissements]);

  return (
    <ul className="flex flex-col gap-1.5 text-sm text-slate-700">
      {ETABLISSEMENT_CATEGORIES.map((category) => (
        <li key={category} className="flex items-center gap-2">
          <CategoryDot color={categoryColors[category]} />
          <span className="flex-1">{t(`legend.${category}`)}</span>
          <span className="text-xs text-slate-500 tabular-nums">{fmt.integer(counts.get(category) ?? 0)}</span>
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-white bg-slate-800 text-[9px] font-semibold text-white shadow"
        >
          12
        </span>
        <span>{t('legend.cluster')}</span>
      </li>
    </ul>
  );
};

export default Legend;
