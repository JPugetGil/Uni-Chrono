import { cx } from './cx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
}

const VARIANTS = {
  primary: 'bg-blue-700 text-white shadow-sm hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-600',
  secondary: 'bg-white text-blue-800 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-400',
};

const SIZES = {
  sm: 'h-8 gap-1.5 px-2.5 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
};

export const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700';

const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', type = 'button', className, ...props }) => (
  <button
    type={type}
    className={cx(
      'inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed',
      focusRing,
      VARIANTS[variant],
      SIZES[size],
      className
    )}
    {...props}
  />
);

export default Button;
