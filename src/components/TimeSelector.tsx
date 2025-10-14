import React from 'react';

interface TimeSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

const TimeSelector: React.FC<TimeSelectorProps> = ({ value, onChange }) => (
  <div style={{ marginBottom: 8 }}>
    <label>Time in minutes:</label>
    <input
      type="number"
      min="1"
      max="60"
      value={value}
      onChange={e => onChange(parseInt(e.target.value))}
      style={{ marginLeft: 8 }}
    />
  </div>
);

export default TimeSelector;
