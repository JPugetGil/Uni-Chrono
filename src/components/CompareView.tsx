import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import IconButton from '../design-system/IconButton';
import { Etablissement } from '../types/etablissement';
import { TransportMode } from '../types/transport';
import { ZoneResult } from '../hooks/useZones';
import { useCommunes } from '../hooks/useHousing';
import { useCrous } from '../hooks/useCrous';
import { communesInIsochrone, medianRent } from '../utils/housing';
import { isPointInIsochrone, isochroneAreaKm2 } from '../utils/geo';
import { useFormatters } from '../i18n/useFormatters';

/** Surface de référence de l'estimation mensuelle (studio) */
const SURFACE = 20;

interface CompareViewProps {
  etablissements: Etablissement[];
  /** Couleur de chaque établissement dans la comparaison (carte et cartes) */
  colorOf: (id: string) => string;
  zoneOf: (id: string) => ZoneResult;
  provider: string;
  timeInMinutes: number;
  transportMode: TransportMode;
  travelSettings: React.ReactNode;
  onSelectEtab: (id: string) => void;
  onClose: () => void;
}

const Stat: React.FC<{ label: string; value: string; best?: boolean }> = ({ label, value, best }) => (
  <div className="min-w-0">
    <dt className="text-xs text-slate-600">{label}</dt>
    <dd className={best ? 'font-semibold text-green-800' : 'font-semibold text-slate-900'}>{value}</dd>
  </div>
);

/** Favoris côte à côte : zone accessible, communes, loyer médian, résidences CROUS, formations */
const CompareView: React.FC<CompareViewProps> = ({
  etablissements,
  colorOf,
  zoneOf,
  provider,
  timeInMinutes,
  transportMode,
  travelSettings,
  onSelectEtab,
  onClose,
}) => {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const { communes } = useCommunes();
  const crous = useCrous(true);

  const rows = useMemo(
    () =>
      etablissements.map((e) => {
        const zone = zoneOf(e.id);
        if (zone.status !== 'ready') return { etablissement: e, zone };
        const coords = zone.isochrone.coordinates;
        const inZone = communes ? communesInIsochrone(coords, communes) : null;
        return {
          etablissement: e,
          zone,
          area: isochroneAreaKm2(coords),
          communes: inZone?.length,
          rent: inZone ? medianRent(inZone) : undefined,
          residences: crous ? crous.logements.filter((l) => isPointInIsochrone(l.lat, l.lon, coords)).length : undefined,
        };
      }),
    [etablissements, zoneOf, communes, crous]
  );

  // Meilleures valeurs (plus grande zone, loyer le plus bas, plus de résidences) mises en évidence
  const values = (pick: (r: (typeof rows)[number]) => number | undefined) =>
    rows.map(pick).filter((v): v is number => v != null);
  const maxArea = Math.max(...values((r) => ('area' in r ? r.area : undefined)));
  const minRent = Math.min(...values((r) => ('rent' in r ? r.rent : undefined)));
  const maxResidences = Math.max(...values((r) => ('residences' in r ? r.residences : undefined)));

  return (
    <article aria-labelledby="compare-title" className="flex flex-col gap-4">
      <header className="flex items-start gap-1">
        <IconButton label={t('details.back')} onClick={onClose} className="-ml-2">
          <ArrowLeft aria-hidden className="size-5" />
        </IconButton>
        <div className="min-w-0 flex-1 pt-1">
          <h2 id="compare-title" className="text-lg leading-snug font-semibold text-slate-900">
            {t('compare.title')}
          </h2>
          <p className="text-sm text-slate-600">
            {t('zone.headline', { time: timeInMinutes, mode: t(`transport.by_${transportMode}`) })}
          </p>
        </div>
      </header>

      {travelSettings}

      <ul className="flex flex-col gap-3">
        {rows.map((row) => {
          const e = row.etablissement;
          return (
            <li key={e.id} className="rounded-xl p-3 ring-1 ring-slate-200" style={{ boxShadow: `inset 4px 0 0 ${colorOf(e.id)}` }}>
              <button type="button" onClick={() => onSelectEtab(e.id)} className="block w-full pl-1 text-left hover:underline">
                <span className="block text-sm font-semibold text-slate-900">{e.nom}</span>
                <span className="block text-xs text-slate-600">
                  {[e.commune, t(`statut.${e.statut}`)].join(' · ')}
                </span>
              </button>
              {row.zone.status === 'pending' && (
                <p className="mt-2 flex items-center gap-2 pl-1 text-sm text-slate-600">
                  <LoaderCircle aria-hidden className="size-4 animate-spin text-blue-700" />
                  {t('zone.computing')}
                </p>
              )}
              {row.zone.status === 'error' && (
                <p className="mt-2 pl-1 text-sm text-slate-700">{t(`zone.errors.${row.zone.error}`, { provider })}</p>
              )}
              {'area' in row && (
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 pl-1 text-sm tabular-nums">
                  <Stat
                    label={t('zone.area')}
                    value={row.area != null ? t('zone.areaValue', { value: fmt.approx(row.area) }) : '—'}
                    best={row.area === maxArea}
                  />
                  <Stat label={t('zone.communes')} value={row.communes != null ? fmt.integer(row.communes) : '—'} />
                  <Stat
                    label={t('compare.rent', { surface: SURFACE })}
                    value={row.rent != null ? t('housing.monthly', { amount: fmt.euros(row.rent * SURFACE) }) : '—'}
                    best={row.rent === minRent}
                  />
                  <Stat
                    label={t('compare.residences')}
                    value={row.residences != null ? fmt.integer(row.residences) : '—'}
                    best={(row.residences ?? 0) > 0 && row.residences === maxResidences}
                  />
                  <Stat label={t('compare.formations')} value={fmt.integer(e.formations)} />
                </dl>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate-500">{t('compare.legend')}</p>
    </article>
  );
};

export default CompareView;
