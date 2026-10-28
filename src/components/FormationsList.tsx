import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ExternalLink, LoaderCircle } from 'lucide-react';
import Button from '../design-system/Button';
import { Etablissement, Formation } from '../types/etablissement';
import { fetchFormations } from '../dataFetcher';

/** Formations Parcoursup du site, chargées à la première ouverture de la section */
const FormationsList: React.FC<{ etablissement: Etablissement }> = ({ etablissement }) => {
  const { t } = useTranslation();
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'ready' | 'error'; items: Formation[] }>({
    status: 'idle',
    items: [],
  });

  const load = () => {
    setState({ status: 'loading', items: [] });
    fetchFormations(etablissement)
      .then((items) => setState({ status: 'ready', items }))
      .catch(() => setState({ status: 'error', items: [] }));
  };

  return (
    <details
      className="group rounded-xl ring-1 ring-slate-200"
      onToggle={(e) => {
        if (e.currentTarget.open && state.status === 'idle') load();
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        {t('formations.title', { count: etablissement.formations })}
        <ChevronDown aria-hidden className="size-4 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-slate-200">
        {state.status === 'loading' && (
          <p className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600">
            <LoaderCircle aria-hidden className="size-4 animate-spin text-blue-700" />
            {t('formations.loading')}
          </p>
        )}
        {state.status === 'error' && (
          <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700">
            <span className="flex-1">{t('formations.error')}</span>
            <Button size="sm" variant="secondary" onClick={load}>
              {t('zone.retry')}
            </Button>
          </div>
        )}
        {state.status === 'ready' && (
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {state.items.map((f, i) => (
              <li key={`${f.fiche ?? f.nom}-${i}`} className="px-3 py-2">
                <p className="text-sm text-slate-900">{f.nom}</p>
                <p className="text-xs text-slate-500">
                  {f.type}
                  {f.apprentissage && ` · ${t('formations.apprenticeship')}`}
                </p>
                {f.fiche && (
                  <a
                    href={f.fiche}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:underline"
                  >
                    {t('formations.fiche')}
                    <ExternalLink aria-hidden className="size-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
};

export default FormationsList;
