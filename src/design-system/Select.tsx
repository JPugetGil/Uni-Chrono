import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from './cx';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

const Select: React.FC<SelectProps> = ({ label, id, className, children, ...props }) => {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={cx('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={selectId} className="text-xs font-medium text-slate-600">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          className="h-9 w-full appearance-none truncate rounded-lg border-0 bg-white py-0 pr-8 pl-3 text-sm text-slate-900 shadow-sm ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-blue-700 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
          {...props}
        >
          {children}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-slate-500" />
      </div>
    </div>
  );
};

export default Select;
