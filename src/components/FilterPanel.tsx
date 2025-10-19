import { useTranslation } from 'react-i18next';
import Select from '../design-system/Select';
import Button from '../design-system/Button';
import TextInput from '../design-system/TextInput';
import { Etablissement } from '../types/etablissement';

export type Filters = {
  type?: string;
  region?: string;
  departement?: string;
  commune?: string;
  name?: string;
};

interface FilterPanelProps {
  etablissements: Etablissement[] | undefined;
  values: Filters;
  onChange: (next: Filters) => void;
  onReset?: () => void;
}

const uniqueSorted = (arr: (string | undefined)[]) =>
  Array.from(new Set(arr.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));

const FilterPanel: React.FC<FilterPanelProps> = ({ etablissements, values, onChange, onReset }) => {
  const { t } = useTranslation();
  
  const types = uniqueSorted((etablissements || []).flatMap(e => e.type_d_etablissement || []));
  const regions = uniqueSorted((etablissements || []).map(e => e.reg_nom));
  const deps = uniqueSorted((etablissements || []).map(e => e.dep_nom));
  const communes = uniqueSorted((etablissements || []).map(e => e.com_nom));

  const set = (patch: Partial<Filters>) => onChange({ ...values, ...patch });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
      <Select label={t('filters.type')} value={values.type || ''} onChange={(e) => set({ type: e.target.value || undefined })} compact>
        <option value="">{t('filters.all')}</option>
        {types.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </Select>
      <Select label={t('filters.region')} value={values.region || ''} onChange={(e) => set({ region: e.target.value || undefined })} compact>
        <option value="">{t('filters.allFeminine')}</option>
        {regions.map(r => (
          <option key={r} value={r}>{r}</option>
        ))}
      </Select>
      <Select label={t('filters.department')} value={values.departement || ''} onChange={(e) => set({ departement: e.target.value || undefined })} compact>
        <option value="">{t('filters.allMasculine')}</option>
        {deps.map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </Select>
      <Select label={t('filters.city')} value={values.commune || ''} onChange={(e) => set({ commune: e.target.value || undefined })} compact>
        <option value="">{t('filters.allFeminine')}</option>
        {communes.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </Select>
      <TextInput
        label={t('filters.name')}
        value={values.name || ''}
        onChange={(e) => set({ name: e.target.value || undefined })}
        placeholder={t('filters.namePlaceholder')}
        compact
      />
      <Button variant="secondary" onClick={onReset} compact>{t('filters.reset')}</Button>
    </div>
  );
};

export default FilterPanel;
