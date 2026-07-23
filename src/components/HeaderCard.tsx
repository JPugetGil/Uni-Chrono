import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../design-system/Card';
import Typography from '../design-system/Typography';
import TimeSelector from './TimeSelector';
import TransportModeSelector from './TransportModeSelector';
import FilterPanel, { Filters } from './FilterPanel';
import LanguageSwitcher from './LanguageSwitcher';
import { Etablissement } from '../types/etablissement';
import { TransportMode } from '../types/transport';
import Button from '../design-system/Button';
import { colors, spacing } from '../design-system/tokens';

interface HeaderCardProps {
  /** Affiche l'aide sur le calcul à la demande (aucune isochrone affichée) */
  showOnDemandHint: boolean;
  timeInMinutes: number;
  onTimeChange: (value: number) => void;
  transportMode: TransportMode;
  onTransportModeChange: (value: TransportMode) => void;
  etablissements: Etablissement[] | undefined;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onFiltersReset: () => void;
}

const HeaderCard: React.FC<HeaderCardProps> = ({
  showOnDemandHint,
  timeInMinutes,
  onTimeChange,
  transportMode,
  onTransportModeChange,
  etablissements,
  filters,
  onFiltersChange,
  onFiltersReset,
}) => {
  const { t } = useTranslation();
  const getIsMobile = () => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false);
  const [isMobile, setIsMobile] = useState<boolean>(getIsMobile);
  const [configOpen, setConfigOpen] = useState<boolean>(() => !getIsMobile());
  // Header repliable pour laisser plus de place à la carte (persisté)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('headerCollapsed') === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem('headerCollapsed', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => {
      setIsMobile(mq.matches);
      if (!mq.matches) setConfigOpen(true);
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Vue repliée : barre fine pour maximiser la surface de la carte
  if (collapsed) {
    return (
      <Card style={{ margin: `${spacing.xs}px 0`, padding: `${spacing.xs}px ${spacing.md}px`, display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <Typography variant="h3">{t('header.title')}</Typography>
        <Button
          variant="secondary"
          compact
          aria-expanded={false}
          title={t('header.expandHeader')}
          onClick={toggleCollapsed}
          style={{ marginLeft: 'auto' }}
        >
          ▾ {t('header.expandHeader')}
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 32, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
          <Typography variant="h1">{t('header.title')}</Typography>
          <Typography variant="body">{t('header.description')}</Typography>
          <LanguageSwitcher />
          {isMobile && (
            <div style={{ marginTop: 8 }}>
              <Button
                variant="secondary"
                compact
                aria-expanded={configOpen}
                onClick={() => setConfigOpen((v) => !v)}
              >
                {configOpen ? t('header.hideConfig') : t('header.showConfig')}
              </Button>
            </div>
          )}
        </div>
        <div
          style={{
            flex: 2,
            minWidth: 220,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }}>
            <Button
              variant="secondary"
              compact
              aria-expanded={true}
              title={t('header.collapseHeader')}
              aria-label={t('header.collapseHeader')}
              onClick={toggleCollapsed}
              style={{ marginLeft: 'auto', lineHeight: 1 }}
            >
              ▴
            </Button>
          </div>
          <div style={{ display: isMobile && !configOpen ? 'none' : 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <TimeSelector value={timeInMinutes} onChange={onTimeChange} />
            <TransportModeSelector value={transportMode} onChange={(v) => onTransportModeChange(v as TransportMode)} />
            {transportMode === 'transit' && (
              <span style={{ fontSize: 12, color: colors.textSecondary, flexBasis: '100%' }}>
                {t('transport.transitHint')}
              </span>
            )}
            {transportMode !== 'transit' && showOnDemandHint && (
              <span style={{ fontSize: 12, color: colors.textSecondary, flexBasis: '100%' }}>
                {t('transport.onDemandHint')}
              </span>
            )}
            <FilterPanel
              etablissements={etablissements}
              values={filters}
              onChange={onFiltersChange}
              onReset={onFiltersReset}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default HeaderCard;
