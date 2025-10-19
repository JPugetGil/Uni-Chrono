import Card from '../design-system/Card';
import Typography from '../design-system/Typography';
import Button from '../design-system/Button';
import { colors, spacing, radii } from '../design-system/tokens';
import { Etablissement } from '../types/etablissement';
import { Isochrone } from '../types/isochrone';
import { useEffect, useState } from 'react';

interface EtablissementDetailsProps {
  etablissement: Etablissement;
  isochrone?: Isochrone;
  resolved?: number;
  total?: number;
  transportMode?: 'walking' | 'cycling' | 'driving-traffic' | 'driving';
  timeInMinutes?: number;
  onClose?: () => void;
}

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
    <Typography variant="caption" style={{ minWidth: 110, color: colors.textSecondary }}>{label}</Typography>
    <Typography variant="body">{value || 'N/A'}</Typography>
  </div>
);

const ExternalLink: React.FC<React.PropsWithChildren<{ href: string }>> = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer" style={{ color: colors.primary, textDecoration: 'none' }}>
    {children}
  </a>
);

const EtablissementDetails: React.FC<EtablissementDetailsProps> = ({
  etablissement,
  isochrone,
  resolved,
  total,
  transportMode,
  timeInMinutes,
  onClose,
}) => {
  const { uai, uo_lib, type_d_etablissement, reg_nom, dep_nom, com_nom, coordonnees, color } = etablissement;

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(uo_lib || '')}`;
  const gmapsUrl = `https://www.google.com/maps?q=${coordonnees.lat},${coordonnees.lon}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${coordonnees.lat}&mlon=${coordonnees.lon}#map=16/${coordonnees.lat}/${coordonnees.lon}`;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      aria-label="Détails de l’établissement"
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
            <Typography variant="h2">{uo_lib}</Typography>
          </div>
          <Button variant="secondary" compact onClick={onClose}>Fermer</Button>
        </div>

        <div style={{ marginTop: spacing.md }}>
          <Row label="UAI" value={uai || '—'} />
          <Row label="Type" value={(type_d_etablissement || []).join(', ') || '—'} />
          <Row label="Région" value={reg_nom || '—'} />
          <Row label="Département" value={dep_nom || '—'} />
          <Row label="Commune" value={com_nom || '—'} />
          <Row label="Coordonnées" value={`${coordonnees.lat.toFixed(5)}, ${coordonnees.lon.toFixed(5)}`} />
        </div>

        <div style={{ marginTop: spacing.md }}>
          <Typography variant="h3" style={{ display: 'block', marginBottom: 8 }}>Liens</Typography>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <ExternalLink href={gmapsUrl}>Google Maps</ExternalLink>
            <ExternalLink href={osmUrl}>OpenStreetMap</ExternalLink>
            <ExternalLink href={searchUrl}>Rechercher</ExternalLink>
          </div>
        </div>

        <div style={{ marginTop: spacing.md }}>
          <Typography variant="h3" style={{ display: 'block', marginBottom: 8 }}>Statistiques</Typography>
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
            <Typography variant="caption">Isochrone</Typography>
            <Typography variant="body">{isochrone ? 'Disponible' : 'En cours / indisponible'}</Typography>

            <Typography variant="caption">Points</Typography>
            <Typography variant="body">{isochrone ? isochrone.coordinates.length : '—'}</Typography>

            {transportMode && (
              <>
                <Typography variant="caption">Mode</Typography>
                <Typography variant="body">{transportMode}</Typography>
              </>
            )}
            {typeof timeInMinutes === 'number' && (
              <>
                <Typography variant="caption">Temps</Typography>
                <Typography variant="body">{timeInMinutes} min</Typography>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EtablissementDetails;
