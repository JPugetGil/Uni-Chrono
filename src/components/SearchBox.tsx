import { useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, ListFilter, LoaderCircle, MapPin, Search, X } from 'lucide-react';
import { Etablissement } from '../types/etablissement';
import { Place } from '../geocodingFetcher';
import { useGeocoder } from '../hooks/useGeocoder';
import { etabId, matchesFilters } from '../utils/filters';
import { matchesAllWords, normalizeText } from '../utils/text';
import { cx } from '../design-system/cx';
import IconButton from '../design-system/IconButton';
import { CategoryDot } from './Legend';

interface SearchBoxProps {
  etablissements: Etablissement[] | undefined;
  onSelectEtab: (id: string) => void;
  /** Ville choisie : ses établissements */
  onSelectCity: (etabs: Etablissement[]) => void;
  onSelectPlace: (place: Place) => void;
  onApplyNameFilter: (name: string) => void;
}

type Suggestion =
  | { kind: 'filter'; key: string; count: number }
  | { kind: 'etab'; key: string; etab: Etablissement; name: string }
  | { kind: 'city'; key: string; name: string; dep?: string | null; etabs: Etablissement[] }
  | { kind: 'place'; key: string; place: Place };

const MAX_ETABS = 5;
const MAX_CITIES = 3;

/** Rang d'une correspondance : début du texte, début d'un mot, ailleurs */
const rank = (text: string, query: string) => (text.startsWith(query) ? 0 : text.includes(` ${query}`) ? 1 : 2);

/**
 * Recherche unique : établissements et villes (données chargées, sans accents),
 * adresses (Géoplateforme), ou filtre par nom. Combobox ARIA au clavier.
 */
const SearchBox: React.FC<SearchBoxProps> = ({ etablissements, onSelectEtab, onSelectCity, onSelectPlace, onApplyNameFilter }) => {
  const { t } = useTranslation();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { places, loading: placesLoading } = useGeocoder(query);

  const index = useMemo(() => {
    const etabs = (etablissements ?? []).map((e) => {
      const key = normalizeText(e.nom);
      return { etab: e, name: e.nom, normalizedName: key, key };
    });
    const cities = new Map<string, { name: string; dep?: string | null; key: string; etabs: Etablissement[] }>();
    for (const e of etablissements ?? []) {
      if (!e.commune) continue;
      const cityKey = `${e.commune}|${e.departement}`;
      const city = cities.get(cityKey) ?? { name: e.commune, dep: e.departement, key: normalizeText(e.commune), etabs: [] };
      city.etabs.push(e);
      cities.set(cityKey, city);
    }
    return { etabs, cities: [...cities.values()] };
  }, [etablissements]);

  const suggestions = useMemo((): Suggestion[] => {
    const q = normalizeText(query);
    if (!q) return [];
    const etabMatches = index.etabs
      .filter((x) => matchesAllWords(x.key, q))
      .sort((a, b) => rank(a.normalizedName, q) - rank(b.normalizedName, q) || a.name.length - b.name.length);
    const nameMatches = (etablissements ?? []).filter((e) => matchesFilters(e, { name: query })).length;
    const cityMatches = index.cities
      .filter((c) => c.key.includes(q))
      .sort((a, b) => rank(a.key, q) - rank(b.key, q) || b.etabs.length - a.etabs.length)
      .slice(0, MAX_CITIES);
    return [
      ...(nameMatches > 0 ? [{ kind: 'filter' as const, key: 'filter', count: nameMatches }] : []),
      ...etabMatches.slice(0, MAX_ETABS).map((x) => ({ kind: 'etab' as const, key: `etab-${etabId(x.etab)}`, etab: x.etab, name: x.name })),
      ...cityMatches.map((c) => ({ kind: 'city' as const, key: `city-${c.name}-${c.dep}`, name: c.name, dep: c.dep, etabs: c.etabs })),
      ...places.map((p) => ({ kind: 'place' as const, key: `place-${p.id}`, place: p })),
    ];
  }, [query, index, places, etablissements]);

  const showList = open && query.trim().length > 0 && (suggestions.length > 0 || placesLoading);

  const choose = (s: Suggestion) => {
    if (s.kind === 'filter') onApplyNameFilter(query.trim());
    else if (s.kind === 'etab') onSelectEtab(etabId(s.etab));
    else if (s.kind === 'city') onSelectCity(s.etabs);
    else onSelectPlace(s.place);
    setQuery('');
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      const target = suggestions[active] ?? suggestions[0];
      if (target) {
        e.preventDefault();
        choose(target);
      }
    } else if (e.key === 'Escape') {
      // Ne ferme pas aussi la fiche ouverte
      e.preventDefault();
      e.stopPropagation();
      if (showList) setOpen(false);
      else setQuery('');
    }
  };

  const optionId = (i: number) => `${listId}-option-${i}`;
  const groupTitle: Partial<Record<Suggestion['kind'], string>> = {
    etab: t('search.groupEtablissements'),
    city: t('search.groupCities'),
    place: t('search.groupPlaces'),
  };

  return (
    <div className="relative">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-slate-500" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label={t('search.label')}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        placeholder={t('search.placeholder')}
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="h-11 w-full rounded-xl border-0 bg-white pr-10 pl-10 text-[15px] text-slate-900 shadow-sm ring-1 ring-slate-300 ring-inset placeholder:text-slate-500 focus:ring-2 focus:ring-blue-700 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <IconButton
          label={t('search.clear')}
          size="sm"
          onClick={() => {
            setQuery('');
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-1.5 -translate-y-1/2"
        >
          <X aria-hidden className="size-4" />
        </IconButton>
      )}

      <ul
        id={listId}
        role="listbox"
        aria-label={t('search.label')}
        hidden={!showList}
        // Garde le focus dans le champ pendant le clic sur une option
        onMouseDown={(e) => e.preventDefault()}
        className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-[min(60vh,28rem)] overflow-y-auto rounded-xl bg-white py-1 shadow-xl ring-1 ring-slate-900/10"
      >
        {suggestions.flatMap((s, i) => {
          const title = groupTitle[s.kind];
          const showTitle = title && suggestions[i - 1]?.kind !== s.kind;
          return [
            showTitle && (
              <li
                key={`${s.kind}-title`}
                role="presentation"
                className="px-3 pt-2.5 pb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
              >
                {title}
              </li>
            ),
            <li
              key={s.key}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              onClick={() => choose(s)}
              onMouseMove={() => setActive(i)}
              className={cx(
                'flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-slate-800',
                i === active && 'bg-blue-50'
              )}
            >
              {s.kind === 'filter' && (
                <>
                  <ListFilter aria-hidden className="size-4 shrink-0 text-blue-800" />
                  <span className="min-w-0 flex-1 font-medium text-blue-800">{t('search.filterBy', { query: query.trim() })}</span>
                  <span className="text-xs text-slate-500 tabular-nums">{s.count}</span>
                </>
              )}
              {s.kind === 'etab' && (
                <>
                  <CategoryDot color={s.etab.color || '#898781'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{s.name}</span>
                    {/* Commune et formations : distinguent les sites d'un même établissement */}
                    <span className="block truncate text-xs text-slate-500">
                      {[s.etab.commune, s.etab.types.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </>
              )}
              {s.kind === 'city' && (
                <>
                  <Building2 aria-hidden className="size-4 shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1 truncate">
                    {s.name}
                    {s.dep && <span className="text-slate-500"> · {s.dep}</span>}
                  </span>
                  <span className="text-xs text-slate-500">{t('search.cityCount', { count: s.etabs.length })}</span>
                </>
              )}
              {s.kind === 'place' && (
                <>
                  <MapPin aria-hidden className="size-4 shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{s.place.label}</span>
                    <span className="block truncate text-xs text-slate-500">{s.place.context}</span>
                  </span>
                </>
              )}
            </li>,
          ];
        })}
        {placesLoading && places.length === 0 && (
          <li role="presentation" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
            <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
            {t('search.searchingPlaces')}
          </li>
        )}
      </ul>
    </div>
  );
};

export default SearchBox;
