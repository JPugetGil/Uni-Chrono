import { colors, spacing, radii, fontSizes, shadows } from './tokens';
import Field from './Field';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: boolean;
  compact?: boolean;
}

const TextInput: React.FC<TextInputProps> = ({ label, helperText, error, compact, style, id, type, ...props }) => {
  const inputId = id || (label ? `${label.replace(/\s+/g, '-').toLowerCase()}-input` : undefined);
  const paddingY = compact ? spacing.xs : spacing.sm;
  const paddingX = compact ? spacing.sm : spacing.md;
  return (
    <Field label={label} helperText={helperText} error={!!error} htmlFor={inputId}>
      <input
        id={inputId}
        type={type || 'text'}
        style={{
          padding: `${paddingY}px ${paddingX}px`,
          borderRadius: radii.md,
          border: `1px solid ${error ? colors.error : colors.border}`,
          background: colors.surface,
          color: colors.text,
          fontSize: fontSizes.md,
          boxShadow: shadows.sm,
          outline: 'none',
          minWidth: 220,
          ...style,
        }}
        {...props}
      />
    </Field>
  );
};

export default TextInput;
