import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/** Formats numériques et dates dans la langue de l'interface (« 16,8 » en français). */
export const useFormatters = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  return useMemo(() => {
    const integer = new Intl.NumberFormat(lang, { maximumFractionDigits: 0 });
    const decimal = new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const euros = new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    const date = new Intl.DateTimeFormat(lang, { dateStyle: 'long' });
    return {
      integer: (n: number) => integer.format(n),
      decimal: (n: number) => decimal.format(n),
      /** Une décimale sous 10, entier au-delà (surfaces) */
      approx: (n: number) => (n < 10 ? decimal.format(n) : integer.format(n)),
      euros: (n: number) => euros.format(n),
      date: (d: Date) => date.format(d),
    };
  }, [lang]);
};
