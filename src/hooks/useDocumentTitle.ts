import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const useDocumentTitle = () => {
  const { t } = useTranslation();
  const title = t('app.documentTitle');

  useEffect(() => {
    document.title = title;
  }, [title]);
};
