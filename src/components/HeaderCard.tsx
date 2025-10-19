import { useTranslation } from 'react-i18next';
import Card from '../design-system/Card';
import Typography from '../design-system/Typography';
import ProgressBar from './ProgressBar';
import TimeSelector from './TimeSelector';
import TransportModeSelector from './TransportModeSelector';
import FilterPanel, { Filters } from './FilterPanel';
import LanguageSwitcher from './LanguageSwitcher';
import { Etablissement } from '../types/etablissement';

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

  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 32, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="h1">{t('header.title')}</Typography>
          <Typography variant="body">{t('header.description')}</Typography>
          <LanguageSwitcher />
        </div>
        <div style={{ flex: 2, minWidth: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
          <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            {total > 0 && (
              <ProgressBar percent={percent} resolved={resolved} total={total} />
            )}
            {loadedFromCache && (
              <span title={cacheTimestampTitle} style={{ marginLeft: 12, padding: '2px 8px', background: '#eef6ff', color: '#1e5bb8', borderRadius: 12, fontSize: 12, whiteSpace: 'nowrap' }}>
                {t('header.loadedFromCache')}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
