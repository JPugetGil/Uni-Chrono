import React from 'react';

interface TransportModeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const TransportModeSelector: React.FC<TransportModeSelectorProps> = ({ value, onChange }) => (
  <div style={{ marginBottom: 8 }}>
    <label>Transport mode:</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ marginLeft: 8 }}
    >
      <option value="driving">Driving</option>
      <option value="walking">Walking</option>
      <option value="cycling">Cycling</option>
      <option value="driving-traffic">Driving (Traffic)</option>
    </select>
  </div>
);

export default TransportModeSelector;
