import Field from '../design-system/Field';
import Select from '../design-system/Select';
import Button from '../design-system/Button';
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
  const types = uniqueSorted((etablissements || []).flatMap(e => e.type_d_etablissement || []));
  const regions = uniqueSorted((etablissements || []).map(e => e.reg_nom));
  const deps = uniqueSorted((etablissements || []).map(e => e.dep_nom));
  const communes = uniqueSorted((etablissements || []).map(e => e.com_nom));

  const set = (patch: Partial<Filters>) => onChange({ ...values, ...patch });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
      <Select label="Type" value={values.type || ''} onChange={(e) => set({ type: e.target.value || undefined })} style={{ minWidth: 220 }}>
        <option value="">Tous</option>
        {types.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </Select>
      <Select label="Region" value={values.region || ''} onChange={(e) => set({ region: e.target.value || undefined })} style={{ minWidth: 180 }}>
        <option value="">Toutes</option>
        {regions.map(r => (
          <option key={r} value={r}>{r}</option>
        ))}
      </Select>
      <Select label="Departement" value={values.departement || ''} onChange={(e) => set({ departement: e.target.value || undefined })} style={{ minWidth: 180 }}>
        <option value="">Tous</option>
        {deps.map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </Select>
      <Select label="City" value={values.commune || ''} onChange={(e) => set({ commune: e.target.value || undefined })} style={{ minWidth: 200 }}>
        <option value="">Toutes</option>
        {communes.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </Select>
      <Field label="Name (contains)">
        <input
          type="text"
          value={values.name || ''}
          onChange={(e) => set({ name: e.target.value || undefined })}
          placeholder="E.g.: Sorbonne"
          style={{ padding: 8, minWidth: 220 }}
        />
      </Field>
      <Button variant="secondary" onClick={onReset} compact>Reset</Button>
    </div>
  );
};

export default FilterPanel;
