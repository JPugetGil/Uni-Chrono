import { colors, fontSizes, radii, spacing, shadows } from '../design-system/tokens';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  children: React.ReactNode;
  compact?: boolean;
}

const getButtonStyle = (variant: ButtonProps['variant'] = 'primary', compact?: boolean) => {
  const paddingY = compact ? spacing.xs : spacing.sm;
  const paddingX = compact ? spacing.sm : spacing.md;
  switch (variant) {
    case 'success':
      return {
        background: colors.success,
        color: '#fff',
        padding: `${paddingY}px ${paddingX}px`,
      };
    case 'danger':
      return {
        background: colors.error,
        color: '#fff',
        padding: `${paddingY}px ${paddingX}px`,
      };
    case 'secondary':
      return {
        background: colors.surface,
        color: colors.primary,
        border: `1px solid ${colors.primary}`,
        padding: `${paddingY}px ${paddingX}px`,
      };
    default:
      return {
        background: colors.primary,
        color: '#fff',
        padding: `${paddingY}px ${paddingX}px`,
      };
  }
};

const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, style, compact, ...props }) => (
  <button
    style={{
      fontSize: fontSizes.md,
      borderRadius: radii.md,
      border: 'none',
      boxShadow: shadows.sm,
      cursor: 'pointer',
      fontWeight: 600,
      ...getButtonStyle(variant, compact),
      ...style,
    }}
    {...props}
  >
    {children}
  </button>
);

export default Button;
