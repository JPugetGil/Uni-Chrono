import { useTranslation } from 'react-i18next';
import { cx } from '../design-system/cx';
import { focusRing } from '../design-system/Button';

const LANGUAGES = [
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'en', label: 'EN', name: 'English' },
];

/**
 * Choix de la langue par code texte : les drapeaux emoji ne s'affichent pas
 * sous Windows (« GB EN ») et une langue n'est pas un pays.
 */
const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const current = i18n.language.startsWith('fr') ? 'fr' : 'en';

  return (
    <div role="group" aria-label={t('language.label')} className="flex rounded-lg bg-slate-100 p-0.5">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          lang={lang.code}
          aria-label={lang.name}
          aria-pressed={current === lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={cx(
            'h-7 rounded-md px-2 text-xs font-semibold transition-colors',
            focusRing,
            current === lang.code ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          )}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
