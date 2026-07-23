import { useTranslation } from 'react-i18next';
import Card from '../design-system/Card';
import Typography from '../design-system/Typography';
import Button from '../design-system/Button';
import { colors, spacing, radii } from '../design-system/tokens';
import { Etablissement, getEtablissementName, getEtablissementTypes } from '../types/etablissement';
import { Isochrone } from '../types/isochrone';
import { TransportMode, transportModeLabelKey } from '../types/transport';
import { flattenCoordinates } from '../utils/geo';
import { useHousing } from '../hooks/useHousing';
import { useEffect, useState } from 'react';

interface EtablissementDetailsProps {
  etablissement: Etablissement;
  isochrone?: Isochrone;
  transportMode?: TransportMode;
  timeInMinutes?: number;
  onClose?: () => void;
}

const MAX_HOUSING_ROWS = 12;

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
    <Typography variant="caption" style={{ minWidth: 110, color: colors.textSecondary }}>{label}</Typography>
    <Typography variant="body">{value || 'N/A'}</Typography>
  </div>
);

const EtablissementDetails: React.FC<EtablissementDetailsProps> = ({
  etablissement,
  isochrone,
  transportMode,
  timeInMinutes,
  onClose,
}) => {
  const { t } = useTranslation();
  const { uai, siege_lib, implantation_lib, reg_nom, dep_nom, com_nom, coordonnees, color, services, date_ouverture } = etablissement;
  const displayName = getEtablissementName(etablissement);
  const types = getEtablissementTypes(etablissement);
  const normalizedSiege = siege_lib ? siege_lib.replace(/\s+/g, ' ').trim() : undefined;
  const normalizedImplantation = implantation_lib ? implantation_lib.replace(/\s+/g, ' ').trim() : undefined;
  const servicesValue = services && services.length > 0 ? services.join(', ') : undefined;
  const typeValue = types.length > 0 ? types.join(', ') : undefined;
  const openingDateValue = (() => {
    if (!date_ouverture) return undefined;
    const parsed = new Date(date_ouverture);
    return Number.isNaN(parsed.getTime()) ? date_ouverture : parsed.toLocaleDateString();
  })();
  const coordinatesValue = coordonnees ? `${coordonnees.lat.toFixed(5)}, ${coordonnees.lon.toFixed(5)}` : undefined;

  const housing = useHousing(isochrone);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div
      aria-label={t('details.title')}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: spacing.lg,
        right: spacing.lg,
        width: 360,
        maxHeight: 'calc(100vh - 2 * 24px)',
        overflowY: 'auto',
        zIndex: 1000,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0px)' : 'translateY(-6px)',
        transition: 'opacity 180ms ease, transform 180ms ease',
      }}
    >
      <Card style={{ padding: spacing.lg }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: color || '#000' }} />
            <Typography variant="h2">{displayName}</Typography>
          </div>
          <Button variant="secondary" compact onClick={onClose}>{t('details.close')}</Button>
        </div>

        <div style={{ marginTop: spacing.md }}>
          <Row label={t('details.uai')} value={uai || '—'} />
          {normalizedSiege && <Row label={t('details.headquarters')} value={normalizedSiege} />}
          {normalizedImplantation && normalizedImplantation !== displayName && (
            <Row label={t('details.implantation')} value={normalizedImplantation} />
          )}
          <Row label={t('details.type')} value={typeValue || '—'} />
          <Row label={t('details.region')} value={reg_nom || '—'} />
          <Row label={t('details.department')} value={dep_nom || '—'} />
          <Row label={t('details.city')} value={com_nom || '—'} />
          {servicesValue && <Row label={t('details.services')} value={servicesValue} />}
          {openingDateValue && <Row label={t('details.openingDate')} value={openingDateValue} />}
          <Row label={t('details.coordinates')} value={coordinatesValue || '—'} />
        </div>

        <div style={{ marginTop: spacing.md }}>
          <Typography variant="h3" style={{ display: 'block', marginBottom: 8 }}>{t('details.statistics')}</Typography>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            rowGap: 6,
            columnGap: 8,
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.md,
            padding: spacing.sm,
          }}>
            <Typography variant="caption">{t('details.isochrone')}</Typography>
            <Typography variant="body">{isochrone ? t('details.available') : t('details.unavailable')}</Typography>

            <Typography variant="caption">{t('details.points')}</Typography>
            <Typography variant="body">{isochrone ? flattenCoordinates(isochrone.coordinates).length : '—'}</Typography>

            {transportMode && (
              <>
                <Typography variant="caption">{t('details.mode')}</Typography>
                <Typography variant="body">{t(transportModeLabelKey(transportMode))}</Typography>
              </>
            )}
            {typeof timeInMinutes === 'number' && (
              <>
                <Typography variant="caption">{t('details.time')}</Typography>
                <Typography variant="body">{t('details.minutes', { time: timeInMinutes })}</Typography>
              </>
            )}
          </div>
        </div>

        {/* Se loger dans la zone : communes de l'isochrone + loyers (Carte des loyers, DHUP) */}
        {housing.status !== 'idle' && (
          <div style={{ marginTop: spacing.md }}>
            <Typography variant="h3" style={{ display: 'block', marginBottom: 8 }}>{t('housing.title')}</Typography>
            {housing.status === 'loading' && (
              <Typography variant="caption">{t('housing.loading')}</Typography>
            )}
            {housing.status === 'error' && (
              <Typography variant="caption">{t('housing.error')}</Typography>
            )}
            {housing.status === 'ready' && housing.items.length === 0 && (
              <Typography variant="caption">{t('housing.empty')}</Typography>
            )}
            {housing.status === 'ready' && housing.items.length > 0 && (
              <>
                <Typography variant="caption" style={{ display: 'block', marginBottom: 8 }}>
                  {t('housing.count', { count: housing.items.length })}
                </Typography>
                <div style={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                }}>
                  {housing.items.slice(0, MAX_HOUSING_ROWS).map((c, i) => (
                    <div
                      key={c.code}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                        padding: `6px ${spacing.sm}px`,
                        background: i % 2 === 0 ? colors.surface : colors.background,
                      }}
                    >
                      <Typography variant="body" style={{ flex: 1, fontSize: 14 }}>{c.nom}</Typography>
                      <Typography variant="caption" style={{ whiteSpace: 'nowrap' }}>
                        {c.population > 0 ? t('housing.population', { count: c.population }) : ''}
                      </Typography>
                      <Typography variant="body" style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 14, color: colors.primaryDark }}>
                        {c.rent != null ? t('housing.rent', { rent: c.rent.toFixed(1) }) : '—'}
                      </Typography>
                    </div>
                  ))}
                </div>
                <Typography variant="caption" style={{ display: 'block', marginTop: 6 }}>
                  {t('housing.source')}
                </Typography>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default EtablissementDetails;
