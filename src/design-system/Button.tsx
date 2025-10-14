import React from 'react';
import { colors, fontSizes, radii, spacing, shadows } from '../design-system/tokens';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  children: React.ReactNode;
}

const getButtonStyle = (variant: ButtonProps['variant'] = 'primary') => {
  switch (variant) {
    case 'success':
      return {
        background: colors.success,
        color: '#fff',
      };
    case 'danger':
      return {
        background: colors.error,
        color: '#fff',
      };
    case 'secondary':
      return {
        background: colors.surface,
        color: colors.primary,
        border: `1px solid ${colors.primary}`,
      };
    default:
      return {
        background: colors.primary,
        color: '#fff',
      };
  }
};

const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, style, ...props }) => (
  <button
    style={{
      fontSize: fontSizes.md,
      borderRadius: radii.md,
      padding: `${spacing.sm}px ${spacing.lg}px`,
      border: 'none',
      boxShadow: shadows.sm,
      cursor: 'pointer',
      fontWeight: 600,
      ...getButtonStyle(variant),
      ...style,
    }}
    {...props}
  >
    {children}
  </button>
);

export default Button;
