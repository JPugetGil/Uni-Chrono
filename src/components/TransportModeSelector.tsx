import { useTranslation } from 'react-i18next';
import Select from '../design-system/Select';

interface TransportModeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const TransportModeSelector: React.FC<TransportModeSelectorProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <Select label={t('transport.label')} value={value} onChange={e => onChange(e.target.value)} compact>
      <option value="driving">{t('transport.driving')}</option>
      <option value="walking">{t('transport.walking')}</option>
      <option value="cycling">{t('transport.cycling')}</option>
      <option value="driving-traffic">{t('transport.drivingTraffic')}</option>
    </Select>
  );
};

export default TransportModeSelector;
