import { X } from 'lucide-react';
import { focusRing } from './Button';
import { cx } from './cx';

interface ChipProps {
  icon?: React.ReactNode;
  label: string;
  /** Nom accessible du bouton de retrait */
  removeLabel: string;
  onRemove: () => void;
}

/** Critère actif (filtre, repère) retirable d'un clic */
const Chip: React.FC<ChipProps> = ({ icon, label, removeLabel, onRemove }) => (
  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-blue-50 py-1 pr-1 pl-2.5 text-xs font-medium text-blue-900 shadow-sm ring-1 ring-blue-200">
    {icon}
    <span className="truncate">{label}</span>
    <button
      type="button"
      onClick={onRemove}
      aria-label={removeLabel}
      title={removeLabel}
      className={cx('rounded-full p-0.5 text-blue-800 hover:bg-blue-100', focusRing)}
    >
      <X aria-hidden className="size-3.5" />
    </button>
  </span>
);

export default Chip;
