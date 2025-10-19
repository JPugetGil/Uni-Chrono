import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../design-system/Card';
import Typography from '../design-system/Typography';
import ProgressBar from './ProgressBar';
import TimeSelector from './TimeSelector';
import TransportModeSelector from './TransportModeSelector';
import FilterPanel, { Filters } from './FilterPanel';
import LanguageSwitcher from './LanguageSwitcher';
import { Etablissement } from '../types/etablissement';
import Button from '../design-system/Button';

interface HeaderCardProps {
  total: number;
  resolved: number;
  percent: number;
  loadedFromCache: boolean;
  cacheTimestampTitle: string;
  timeInMinutes: number;
  onTimeChange: (value: number) => void;
  transportMode: 'walking' | 'cycling' | 'driving-traffic' | 'driving';
  onTransportModeChange: (value: 'walking' | 'cycling' | 'driving-traffic' | 'driving') => void;
  etablissements: Etablissement[] | undefined;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onFiltersReset: () => void;
}

const HeaderCard: React.FC<HeaderCardProps> = ({
  total,
  resolved,
  percent,
  loadedFromCache,
  cacheTimestampTitle,
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

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!isMobile) setConfigOpen(true);
  }, [isMobile]);

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
          <div style={{ marginBottom: 8, display: isMobile && !configOpen ? 'none' : 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            {total > 0 && (
              <ProgressBar percent={percent} resolved={resolved} total={total} />
            )}
            {loadedFromCache && (
              <span title={cacheTimestampTitle} style={{ marginLeft: 12, padding: '2px 8px', background: '#eef6ff', color: '#1e5bb8', borderRadius: 12, fontSize: 12, whiteSpace: 'nowrap' }}>
                {t('header.loadedFromCache')}
              </span>
            )}
          </div>
          <div style={{ display: isMobile && !configOpen ? 'none' : 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <TimeSelector value={timeInMinutes} onChange={onTimeChange} />
            <TransportModeSelector value={transportMode} onChange={(v) => onTransportModeChange(v as typeof transportMode)} />
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
