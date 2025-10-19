import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const useDocumentTitle = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const title = i18n.language === 'fr' 
      ? 'Uni-Chrono - Isochrones universitaires'
      : 'Uni-Chrono - University Isochrones';
    document.title = title;
  }, [i18n.language]);
};
