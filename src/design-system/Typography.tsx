import React from 'react';
import { colors, fontSizes, radii, spacing } from '../design-system/tokens';

interface TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const getTypographyStyle = (variant: TypographyProps['variant'] = 'body') => {
  switch (variant) {
    case 'h1':
      return { fontSize: fontSizes.xl, fontWeight: 700, color: colors.primary };
    case 'h2':
      return { fontSize: fontSizes.lg, fontWeight: 600, color: colors.primary };
    case 'h3':
      return { fontSize: fontSizes.md, fontWeight: 600, color: colors.text };
    case 'caption':
      return { fontSize: fontSizes.xs, color: colors.textSecondary };
    default:
      return { fontSize: fontSizes.md, color: colors.text };
  }
};

const Typography: React.FC<TypographyProps> = ({ variant = 'body', children, style }) => (
  <span style={{ ...getTypographyStyle(variant), ...style }}>{children}</span>
);

export default Typography;
