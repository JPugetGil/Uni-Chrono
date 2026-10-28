import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import IconButton from '../design-system/IconButton';
import { MAX_FAVORITES } from '../hooks/useFavorites';

interface FavoriteButtonProps {
  active: boolean;
  /** Liste pleine : l'ajout est impossible tant qu'un favori n'est pas retiré */
  full: boolean;
  onToggle: () => void;
}

/** Ajout ou retrait des favoris (comparaison) */
const FavoriteButton: React.FC<FavoriteButtonProps> = ({ active, full, onToggle }) => {
  const { t } = useTranslation();
  const label = active ? t('favorites.removeThis') : full ? t('favorites.full', { max: MAX_FAVORITES }) : t('favorites.add');
  return (
    <IconButton label={label} aria-pressed={active} disabled={!active && full} onClick={onToggle}>
      <Star aria-hidden className={active ? 'size-5 fill-amber-400 text-amber-500' : 'size-5'} />
    </IconButton>
  );
};

export default FavoriteButton;
