import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { useDataMeta } from '../hooks/useDataMeta';
import { useFormatters } from '../i18n/useFormatters';

const Source: React.FC<{ href: string; label: string; detail: string }> = ({ href, label, detail }) => (
  <li>
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-800 hover:underline">
      {label}
    </a>
    <span className="text-slate-600"> · {detail}</span>
  </li>
);

/**
 * Origine, licence et fraîcheur des données (la Licence Ouverte impose de
 * citer la source).
 */
const DataSources: React.FC = () => {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const meta = useDataMeta();
  const date = (iso?: string) => (iso ? fmt.date(new Date(iso)) : '—');

  return (
    <details className="group text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 [&::-webkit-details-marker]:hidden">
        {t('sources.title')}
        <ChevronDown aria-hidden className="size-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        <Source
          href={meta?.parcoursup.url ?? 'https://data.enseignementsup-recherche.gouv.fr/'}
          label={t('sources.parcoursup', { year: meta?.parcoursup.year ?? '' })}
          detail={t('sources.parcoursupDetail', { date: date(meta?.parcoursup.processed) })}
        />
        <Source
          href={meta?.rents.datasetUrl ?? 'https://www.data.gouv.fr/'}
          label={t('sources.rents', { year: meta?.rents.year ?? '' })}
          detail={t('sources.rentsDetail')}
        />
        <Source href="https://geo.api.gouv.fr/" label={t('sources.communes')} detail={t('sources.communesDetail')} />
        <Source
          href={meta?.crous?.url ?? 'https://data.enseignementsup-recherche.gouv.fr/'}
          label={t('sources.crous')}
          detail={t('sources.crousDetail', { date: date(meta?.crous?.processed) })}
        />
        <Source href="https://geoservices.ign.fr/documentation/services/services-geoplateforme/itineraire" label={t('sources.isochrones')} detail={t('sources.isochronesDetail')} />
        <Source href="https://geoservices.ign.fr/documentation/services/services-geoplateforme/geocodage" label={t('sources.geocoding')} detail="IGN" />
      </ul>
      {meta && <p className="mt-2 text-slate-500">{t('sources.generatedAt', { date: date(meta.generatedAt) })}</p>}
    </details>
  );
};

export default DataSources;
