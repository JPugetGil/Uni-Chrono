import { useTranslation } from 'react-i18next';
import { CircleHelp, SlidersHorizontal } from 'lucide-react';
import IconButton from '../design-system/IconButton';
import { Etablissement } from '../types/etablissement';
import { Filters, countActiveFilters } from '../utils/filters';
import Brand from './Brand';
import LanguageSwitcher from './LanguageSwitcher';
import Onboarding from './Onboarding';
import FilterPanel from './FilterPanel';
import Legend from './Legend';
import DataSources from './DataSources';

interface ExplorePanelProps {
  /** Mobile : la marque et la langue sont dans le volet (pas d'en-tête de panneau) */
  showBrand: boolean;
  onboardingVisible: boolean;
  onDismissOnboarding: () => void;
  onShowHelp: () => void;
  /** Réglages de trajet (mode, durée) */
  travelSettings: React.ReactNode;
  etablissements: Etablissement[] | undefined;
  filteredEtablissements: Etablissement[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onFiltersReset: () => void;
}

/** Contenu du panneau sans sélection : aide, trajet, filtres, légende. */
const ExplorePanel: React.FC<ExplorePanelProps> = ({
  showBrand,
  onboardingVisible,
  onDismissOnboarding,
  onShowHelp,
  travelSettings,
  etablissements,
  filteredEtablissements,
  filters,
  onFiltersChange,
  onFiltersReset,
}) => {
  const { t } = useTranslation();
  const activeFilters = countActiveFilters({ ...filters, name: undefined });

  return (
    <div className="flex flex-col gap-5">
      {showBrand && (
        <div className="flex items-center gap-2">
          <Brand />
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            {!onboardingVisible && (
              <IconButton label={t('panel.help')} size="sm" onClick={onShowHelp}>
                <CircleHelp aria-hidden className="size-5" />
              </IconButton>
            )}
          </div>
        </div>
      )}

      {onboardingVisible && <Onboarding onDismiss={onDismissOnboarding} />}

      {travelSettings}

      <section aria-labelledby="filters-title" className="flex flex-col gap-3">
        <h2 id="filters-title" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <SlidersHorizontal aria-hidden className="size-4 text-slate-600" />
          {t('filters.title')}
          {activeFilters > 0 && (
            <span className="rounded-full bg-blue-700 px-1.5 text-[11px] leading-5 font-semibold text-white">{activeFilters}</span>
          )}
        </h2>
        <FilterPanel
          etablissements={etablissements}
          values={filters}
          onChange={onFiltersChange}
          onReset={onFiltersReset}
        />
      </section>

      <section aria-labelledby="legend-title" className="flex flex-col gap-3">
        <h2 id="legend-title" className="text-sm font-semibold text-slate-900">
          {t('legend.title')}
        </h2>
        <Legend etablissements={filteredEtablissements} />
      </section>

      <DataSources />
    </div>
  );
};

export default ExplorePanel;
