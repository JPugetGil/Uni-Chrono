import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { Isochrone } from '../types/isochrone';
import { useCrous } from '../hooks/useCrous';
import { isPointInIsochrone } from '../utils/geo';
import { colors } from '../design-system/tokens';

interface CrousInZoneProps {
  isochrone: Isochrone;
  /** Position de l'établissement : les résidences sont triées par distance */
  origin: { lat: number; lon: number };
}

/** Résidences (et restaurants) CROUS situés dans la zone accessible */
const CrousInZone: React.FC<CrousInZoneProps> = ({ isochrone, origin }) => {
  const { t } = useTranslation();
  const data = useCrous(true);

  const inZone = useMemo(() => {
    if (!data) return null;
    const inside = (p: { lat: number; lon: number }) => isPointInIsochrone(p.lat, p.lon, isochrone.coordinates);
    // Distance approchée (degrés corrigés de la latitude), suffisante pour trier
    const cos = Math.cos((origin.lat * Math.PI) / 180);
    const dist = (p: { lat: number; lon: number }) => (p.lat - origin.lat) ** 2 + ((p.lon - origin.lon) * cos) ** 2;
    return {
      logements: data.logements.filter(inside).sort((a, b) => dist(a) - dist(b)),
      restaurants: data.restaurants.filter((r) => !r.ferme && inside(r)).length,
    };
  }, [data, isochrone, origin]);

  if (!inZone) return null;

  return (
    <section aria-labelledby="crous-title" className="flex flex-col gap-2">
      <h3 id="crous-title" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span aria-hidden className="size-3 rounded-[3px]" style={{ background: colors.crousLogement }} />
        {inZone.logements.length > 0 ? t('crous.inZone', { count: inZone.logements.length }) : t('crous.noneInZone')}
      </h3>
      {inZone.logements.length > 0 && (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl ring-1 ring-slate-200">
          {inZone.logements.map((l) => (
            <li key={l.id} className="px-3 py-2">
              <p className="text-sm font-medium text-slate-900">{l.nom}</p>
              <p className="text-xs text-slate-600">{l.adresse ?? l.ville}</p>
              {l.url && (
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:underline"
                >
                  {t('crous.book')}
                  <ExternalLink aria-hidden className="size-3" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      {inZone.restaurants > 0 && (
        <p className="flex items-center gap-2 text-xs text-slate-600">
          <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: colors.crousRestaurant }} />
          {t('crous.restaurants', { count: inZone.restaurants })}
        </p>
      )}
    </section>
  );
};

export default CrousInZone;
