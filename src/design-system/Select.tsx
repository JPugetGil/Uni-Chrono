import { colors, spacing, radii, fontSizes, shadows } from './tokens';
import Field from './Field';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: boolean;
  compact?: boolean;
}

const Select: React.FC<SelectProps> = ({ label, helperText, error, compact, style, id, children, ...props }) => {
  const selectId = id || (label ? `${label.replace(/\s+/g, '-').toLowerCase()}-select` : undefined);
  const paddingY = compact ? spacing.xs : spacing.sm;
  const paddingX = compact ? spacing.sm : spacing.md;
  return (
    <Field label={label} helperText={helperText} error={!!error} htmlFor={selectId}>
      <select
        id={selectId}
        style={{
          padding: `${paddingY}px ${paddingX}px`,
          borderRadius: radii.md,
          border: `1px solid ${error ? colors.error : colors.border}`,
          background: colors.surface,
          color: colors.text,
          fontSize: fontSizes.md,
          boxShadow: shadows.sm,
          outline: 'none',
          ...style,
        }}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
};

export default Select;
