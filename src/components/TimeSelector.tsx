import NumberInput from '../design-system/NumberInput';

interface TimeSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

const TimeSelector: React.FC<TimeSelectorProps> = ({ value, onChange }) => (
  <NumberInput
    label="Time in minutes"
    min={1}
    max={60}
    value={value}
    onChange={(e) => onChange(parseInt(e.target.value))}
    compact
  />
);

export default TimeSelector;
