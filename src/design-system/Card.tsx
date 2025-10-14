import React from 'react';
import { colors, fontSizes, radii, spacing, shadows } from '../design-system/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({ children, style }) => (
  <div
    style={{
      background: colors.surface,
      borderRadius: radii.md,
      boxShadow: shadows.md,
      padding: spacing.lg,
      margin: `${spacing.md}px 0`,
      border: `1px solid ${colors.border}`,
      ...style,
    }}
  >
    {children}
  </div>
);

export default Card;
