import React from 'react';
import { colors, spacing, radii } from '../design-system/tokens';

interface SurfaceProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const Surface: React.FC<SurfaceProps> = ({ children, style }) => (
  <div
    style={{
      background: colors.background,
      borderRadius: radii.lg,
      padding: spacing.lg,
      minHeight: 100,
      ...style,
    }}
  >
    {children}
  </div>
);

export default Surface;
