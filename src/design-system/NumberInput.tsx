import { colors, spacing, radii, fontSizes, shadows } from './tokens';
import Field from './Field';

interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: boolean;
  compact?: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({ label, helperText, error, compact, style, id, ...props }) => {
  const inputId = id || (label ? `${label.replace(/\s+/g, '-').toLowerCase()}-input` : undefined);
  const paddingY = compact ? spacing.xs : spacing.sm;
  const paddingX = compact ? spacing.sm : spacing.md;
  return (
    <Field label={label} helperText={helperText} error={!!error} htmlFor={inputId}>
      <input
        id={inputId}
        type="number"
        style={{
          padding: `${paddingY}px ${paddingX}px`,
          borderRadius: radii.md,
          border: `1px solid ${error ? colors.error : colors.border}`,
          background: colors.surface,
          color: colors.text,
          fontSize: fontSizes.md,
          boxShadow: shadows.sm,
          outline: 'none',
          width: 120,
          ...style,
        }}
        {...props}
      />
    </Field>
  );
};

export default NumberInput;
