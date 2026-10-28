import { useTranslation } from 'react-i18next';
import { Star, X } from 'lucide-react';
import Button from '../design-system/Button';
import IconButton from '../design-system/IconButton';
import { Etablissement } from '../types/etablissement';
import { CategoryDot } from './Legend';

interface FavoritesSectionProps {
  favorites: Etablissement[];
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onCompare: () => void;
}

/** Favoris : accès rapide et comparaison (à partir de deux) */
const FavoritesSection: React.FC<FavoritesSectionProps> = ({ favorites, onSelect, onRemove, onCompare }) => {
  const { t } = useTranslation();
  if (favorites.length === 0) return null;

  return (
    <section aria-labelledby="favorites-title" className="flex flex-col gap-2">
      <h2 id="favorites-title" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Star aria-hidden className="size-4 fill-amber-400 text-amber-500" />
        {t('favorites.title')}
      </h2>
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl ring-1 ring-slate-200">
        {favorites.map((e) => (
          <li key={e.id} className="flex items-center gap-1 pr-1">
            <button
              type="button"
              onClick={() => onSelect(e.id)}
              className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 focus-visible:bg-blue-50 focus-visible:outline-none"
            >
              <CategoryDot color={e.color || '#898781'} />
              <span className="min-w-0">
                <span className="block truncate text-sm text-slate-900">{e.nom}</span>
                <span className="block truncate text-xs text-slate-500">{e.commune}</span>
              </span>
            </button>
            <IconButton label={t('favorites.remove', { name: e.nom })} size="sm" onClick={() => onRemove(e.id)}>
              <X aria-hidden className="size-4" />
            </IconButton>
          </li>
        ))}
      </ul>
      {favorites.length >= 2 && (
        <Button size="sm" variant="secondary" onClick={onCompare} className="self-start">
          {t('favorites.compare', { count: favorites.length })}
        </Button>
      )}
    </section>
  );
};

export default FavoritesSection;
