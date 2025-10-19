import { useTranslation } from 'react-i18next';
import Button from '../design-system/Button';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
  };

  return (
    <Button 
      variant="secondary" 
      compact 
      onClick={toggleLanguage}
      style={{ width: 'fit-content', marginTop: 16 }}
    >
      {i18n.language === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR'}
    </Button>
  );
};

export default LanguageSwitcher;
