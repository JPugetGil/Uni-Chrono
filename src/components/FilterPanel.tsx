import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import Select from '../design-system/Select';
import Button from '../design-system/Button';
import { Etablissement, getEtablissementTypes } from '../types/etablissement';
import { Filters, countActiveFilters, matchesFilters } from '../utils/filters';

interface FilterPanelProps {
  etablissements: Etablissement[] | undefined;
  values: Filters;
  onChange: (next: Filters) => void;
  onReset?: () => void;
}

type Option = { value: string; count: number };

/**
 * Options d'un filtre avec effectifs, calculées sur les établissements qui
 * passent les autres filtres, hors ceux de `ignored` : la cascade géographique
 * va du haut vers le bas (une ville choisie ne restreint pas la liste des
 * régions, sinon on ne pourrait plus en changer). La valeur sélectionnée reste
 * proposée même si son effectif tombe à zéro.
 */
const optionsFor = (
  etablissements: Etablissement[],
  values: Filters,
  key: keyof Filters,
  ignored: (keyof Filters)[],
  valuesOf: (e: Etablissement) => (string | null | undefined)[]
): Option[] => {
  const scope: Filters = { ...values };
  for (const k of ignored) delete scope[k];
  const counts = new Map<string, number>();
  for (const e of etablissements) {
    if (!matchesFilters(e, scope)) continue;
    for (const v of valuesOf(e)) {
      if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  const selected = values[key];
  if (selected && !counts.has(selected)) counts.set(selected, 0);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, 'fr'));
};

/** Valeur unique d'un attribut parmi les établissements retenus, sinon undefined */
const uniqueValue = (etabs: Etablissement[], pick: (e: Etablissement) => string | null | undefined) => {
  const values = new Set(etabs.map(pick).filter(Boolean));
  return values.size === 1 ? (values.values().next().value as string) : undefined;
};

const FilterPanel: React.FC<FilterPanelProps> = ({ etablissements, values, onChange, onReset }) => {
  const { t } = useTranslation();
  const etabs = useMemo(() => etablissements ?? [], [etablissements]);
  const disabled = !etablissements;

  const types = useMemo(() => optionsFor(etabs, values, 'type', ['type'], getEtablissementTypes), [etabs, values]);
  const regions = useMemo(
    () => optionsFor(etabs, values, 'region', ['region', 'departement', 'commune'], (e) => [e.reg_nom]),
    [etabs, values]
  );
  const deps = useMemo(
    () => optionsFor(etabs, values, 'departement', ['departement', 'commune'], (e) => [e.dep_nom]),
    [etabs, values]
  );
  const communes = useMemo(() => optionsFor(etabs, values, 'commune', ['commune'], (e) => [e.com_nom]), [etabs, values]);

  // Région : on retire département et ville qui n'y appartiennent pas
  const setRegion = (region?: string) => {
    const inRegion = (pick: (e: Etablissement) => string | null | undefined, v?: string) =>
      !region || !v || etabs.some((e) => e.reg_nom === region && pick(e) === v);
    onChange({
      ...values,
      region,
      departement: inRegion((e) => e.dep_nom, values.departement) ? values.departement : undefined,
      commune: inRegion((e) => e.com_nom, values.commune) ? values.commune : undefined,
    });
  };

  // Département : on complète la région et on retire la ville hors département
  const setDepartement = (departement?: string) => {
    const inDep = etabs.filter((e) => e.dep_nom === departement);
    const keepCommune = !departement || !values.commune || inDep.some((e) => e.com_nom === values.commune);
    onChange({
      ...values,
      departement,
      region: departement ? uniqueValue(inDep, (e) => e.reg_nom) ?? values.region : values.region,
      commune: keepCommune ? values.commune : undefined,
    });
  };

  // Ville : on complète département et région quand le nom est sans ambiguïté
  const setCommune = (commune?: string) => {
    const inCommune = etabs.filter(
      (e) => e.com_nom === commune && (!values.departement || e.dep_nom === values.departement)
    );
    onChange({
      ...values,
      commune,
      departement: commune ? uniqueValue(inCommune, (e) => e.dep_nom) ?? values.departement : values.departement,
      region: commune ? uniqueValue(inCommune, (e) => e.reg_nom) ?? values.region : values.region,
    });
  };

  const renderOptions = (options: Option[]) =>
    options.map((o) => (
      <option key={o.value} value={o.value}>
        {t('filters.option', { label: o.value, count: o.count })}
      </option>
    ));

  const active = countActiveFilters({ ...values, name: undefined });

  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-3">
      <Select
        label={t('filters.region')}
        value={values.region || ''}
        onChange={(e) => setRegion(e.target.value || undefined)}
        disabled={disabled}
        className="col-span-2"
      >
        <option value="">{t('filters.allFeminine')}</option>
        {renderOptions(regions)}
      </Select>
      <Select
        label={t('filters.department')}
        value={values.departement || ''}
        onChange={(e) => setDepartement(e.target.value || undefined)}
        disabled={disabled}
      >
        <option value="">{t('filters.allMasculine')}</option>
        {renderOptions(deps)}
      </Select>
      <Select
        label={t('filters.city')}
        value={values.commune || ''}
        onChange={(e) => setCommune(e.target.value || undefined)}
        disabled={disabled}
      >
        <option value="">{t('filters.allFeminine')}</option>
        {renderOptions(communes)}
      </Select>
      <Select
        label={t('filters.type')}
        value={values.type || ''}
        onChange={(e) => onChange({ ...values, type: e.target.value || undefined })}
        disabled={disabled}
        className="col-span-2"
      >
        <option value="">{t('filters.all')}</option>
        {renderOptions(types)}
      </Select>
      {active > 0 && onReset && (
        <Button variant="ghost" size="sm" onClick={onReset} className="col-span-2 justify-self-start">
          <RotateCcw aria-hidden className="size-4" />
          {t('filters.reset')}
        </Button>
      )}
    </div>
  );
};

export default FilterPanel;
