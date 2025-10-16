import React from 'react';
import { spacing, fontSizes, colors } from './tokens';

interface FieldProps {
  label?: string;
  helperText?: string;
  error?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const Field: React.FC<FieldProps> = ({ label, helperText, error, htmlFor, children, style }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, ...style }}>
      {label && (
        <label htmlFor={htmlFor} style={{ fontSize: fontSizes.sm, color: colors.textSecondary }}>
          {label}
        </label>
      )}
      {children}
      {helperText && (
        <span style={{ fontSize: fontSizes.xs, color: error ? colors.error : colors.textSecondary }}>{helperText}</span>
      )}
    </div>
  );
};

export default Field;
