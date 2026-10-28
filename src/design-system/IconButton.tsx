import { cx } from './cx';
import { focusRing } from './Button';

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Nom accessible, aussi affiché en infobulle */
  label: string;
  size?: 'sm' | 'md';
}

const IconButton: React.FC<IconButtonProps> = ({ label, size = 'md', type = 'button', className, children, ...props }) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    className={cx(
      'inline-flex shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300',
      focusRing,
      size === 'sm' ? 'size-8' : 'size-10',
      className
    )}
    {...props}
  >
    {children}
  </button>
);

export default IconButton;
