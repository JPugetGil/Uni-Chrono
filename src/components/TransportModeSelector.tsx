import Select from '../design-system/Select';

interface TransportModeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const TransportModeSelector: React.FC<TransportModeSelectorProps> = ({ value, onChange }) => (
  <Select label="Transport mode" value={value} onChange={e => onChange(e.target.value)} compact>
    <option value="driving">Driving</option>
    <option value="walking">Walking</option>
    <option value="cycling">Cycling</option>
    <option value="driving-traffic">Driving (Traffic)</option>
  </Select>
);

export default TransportModeSelector;
