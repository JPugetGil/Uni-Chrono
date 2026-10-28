import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ExternalLink } from 'lucide-react';
import IconButton from '../design-system/IconButton';
import { Etablissement } from '../types/etablissement';
import { Isochrone } from '../types/isochrone';
import { TransportMode } from '../types/transport';
import { useHousing } from '../hooks/useHousing';
import { medianRent } from '../utils/housing';
import { CategoryDot } from './Legend';
import ZoneSummary, { ZoneStatus } from './ZoneSummary';
import HousingList from './HousingList';
import FormationsList from './FormationsList';

interface EtablissementDetailsProps {
  etablissement: Etablissement;
  isochrone?: Isochrone | null;
  zoneStatus: ZoneStatus;
  onRetryZone?: () => void;
  transportMode: TransportMode;
  timeInMinutes: number;
  onClose: () => void;
  pinnedCommune: string | null;
  onPinCommune: (code: string | null) => void;
  onHoverCommune: (code: string | null) => void;
  /** Réglages de trajet (mode, durée), modifiables sans quitter la fiche */
  travelSettings: React.ReactNode;
}

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-[7.5rem_1fr] gap-2 py-1.5">
    <dt className="text-xs text-slate-600">{label}</dt>
    <dd className="text-sm break-words text-slate-900">{value || '—'}</dd>
  </div>
);

/**
 * Fiche d'un établissement dans le panneau : zone accessible et ses chiffres,
 * logements dans la zone, puis informations administratives (repliées).
 */
const EtablissementDetails: React.FC<EtablissementDetailsProps> = ({
  etablissement,
  isochrone,
  zoneStatus,
  onRetryZone,
  transportMode,
  timeInMinutes,
  onClose,
  pinnedCommune,
  onPinCommune,
  onHoverCommune,
  travelSettings,
}) => {
  const { t } = useTranslation();
  const { id, uai, nom, region, departement, commune, coordonnees, color, category, statut, types, url } = etablissement;

  const housing = useHousing(zoneStatus === 'ready' && isochrone ? isochrone : undefined);
  const [surface, setSurface] = useState(20);

  // Le titre prend le focus à l'ouverture : les lecteurs d'écran annoncent la fiche
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [id]);

  return (
    <article aria-labelledby="etab-title" className="flex flex-col gap-4">
      <header className="flex items-start gap-1">
        <IconButton label={t('details.back')} onClick={onClose} className="-ml-2">
          <ArrowLeft aria-hidden className="size-5" />
        </IconButton>
        <div className="min-w-0 flex-1 pt-1">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <CategoryDot color={color || '#898781'} className="size-3" />
            {t(`legend.${category}`)} · {t(`statut.${statut}`)}
          </p>
          <h2
            id="etab-title"
            ref={titleRef}
            tabIndex={-1}
            className="mt-1 text-lg leading-snug font-semibold break-words text-slate-900 outline-none"
          >
            {nom}
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">{[commune, departement].filter(Boolean).join(' · ')}</p>
        </div>
      </header>

      {travelSettings}

      <ZoneSummary
        status={zoneStatus}
        isochrone={isochrone}
        transportMode={transportMode}
        timeInMinutes={timeInMinutes}
        housingStatus={housing.status}
        communesCount={housing.items.length}
        medianRent={medianRent(housing.items)}
        surface={surface}
        onRetry={onRetryZone}
      />

      <HousingList
        status={housing.status}
        items={housing.items}
        surface={surface}
        onSurfaceChange={setSurface}
        pinnedCommune={pinnedCommune}
        onPinCommune={onPinCommune}
        onHoverCommune={onHoverCommune}
      />

      <FormationsList etablissement={etablissement} />

      <details className="group rounded-xl ring-1 ring-slate-200">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
          {t('details.sheet')}
          <ChevronDown aria-hidden className="size-4 text-slate-500 transition-transform group-open:rotate-180" />
        </summary>
        <dl className="divide-y divide-slate-100 border-t border-slate-200 px-3 pb-1">
          <Row label={t('details.uai')} value={uai} />
          <Row label={t('details.statut')} value={t(`statut.${statut}`)} />
          <Row label={t('details.types')} value={types.join(', ')} />
          <Row label={t('details.region')} value={region} />
          <Row label={t('details.department')} value={departement} />
          <Row label={t('details.city')} value={commune} />
          {url && (
            <Row
              label={t('details.website')}
              value={
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium break-all text-blue-800 hover:underline"
                >
                  {url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                  <ExternalLink aria-hidden className="size-3 shrink-0" />
                </a>
              }
            />
          )}
          <Row
            label={t('details.coordinates')}
            value={coordonnees ? `${coordonnees.lat.toFixed(5)}, ${coordonnees.lon.toFixed(5)}` : undefined}
          />
        </dl>
      </details>
    </article>
  );
};

export default EtablissementDetails;
