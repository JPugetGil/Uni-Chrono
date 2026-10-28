import { useId } from 'react';
import { cx } from './cx';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Nom accessible quand le libellé visible est abrégé */
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string | number> {
  legend: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  /** Masque la légende visuellement (elle reste lue par les lecteurs d'écran) */
  hideLegend?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Choix exclusif sous forme de boutons accolés : radios natives (flèches du
 * clavier, lecteurs d'écran) habillées en segments.
 */
const SegmentedControl = <T extends string | number>({
  legend,
  value,
  options,
  onChange,
  hideLegend,
  size = 'md',
}: SegmentedControlProps<T>) => {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className={cx('mb-1.5 text-xs font-medium text-slate-600', hideLegend && 'sr-only')}>{legend}</legend>
      <div
        className="grid gap-1 rounded-xl bg-slate-100 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <label key={String(option.value)} className="relative min-w-0">
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              aria-label={option.ariaLabel}
              className="peer sr-only"
            />
            <span
              className={cx(
                'flex cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors select-none',
                'hover:bg-white/70 hover:text-slate-900',
                'peer-checked:bg-white peer-checked:font-semibold peer-checked:text-blue-800 peer-checked:shadow-sm',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-blue-700',
                option.icon ? 'flex-col gap-0.5 py-1.5 text-[11px] leading-tight' : size === 'sm' ? 'h-7 text-xs' : 'h-8 text-sm'
              )}
            >
              {option.icon}
              <span className="max-w-full truncate px-0.5">{option.label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};

export default SegmentedControl;
