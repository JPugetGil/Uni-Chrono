import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import Button from '../design-system/Button';
import IconButton from '../design-system/IconButton';

interface OnboardingProps {
  onDismiss: () => void;
}

/** Aide au premier usage : chercher une école, voir sa zone accessible. */
const Onboarding: React.FC<OnboardingProps> = ({ onDismiss }) => {
  const { t } = useTranslation();
  const steps = [t('onboarding.step1'), t('onboarding.step2')];

  return (
    <section aria-labelledby="onboarding-title" className="relative rounded-xl bg-blue-50 p-3 ring-1 ring-blue-100">
      <IconButton label={t('onboarding.dismiss')} size="sm" onClick={onDismiss} className="absolute top-1.5 right-1.5">
        <X aria-hidden className="size-4" />
      </IconButton>
      <h2 id="onboarding-title" className="pr-8 text-sm font-semibold text-blue-900">
        {t('onboarding.title')}
      </h2>
      <ol className="mt-2 flex flex-col gap-1.5 text-sm text-slate-700">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span
              aria-hidden
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-700 text-[11px] font-semibold text-white"
            >
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <Button size="sm" onClick={onDismiss} className="mt-3">
        {t('onboarding.dismiss')}
      </Button>
    </section>
  );
};

export default Onboarding;
