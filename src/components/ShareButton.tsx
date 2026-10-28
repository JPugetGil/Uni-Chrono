import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Share2 } from 'lucide-react';
import IconButton from '../design-system/IconButton';

/**
 * Partage de la page courante (l'URL porte la fiche et les réglages) :
 * partage natif du téléphone si disponible, sinon copie du lien.
 */
const ShareButton: React.FC<{ title: string }> = ({ title }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // Partage annulé par l'utilisateur : rien d'autre à faire
        if ((error as DOMException)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt(t('share.copyPrompt'), url);
    }
  };

  return (
    <div className="relative">
      <IconButton label={t('share.label')} onClick={share}>
        {copied ? <Check aria-hidden className="size-5 text-green-700" /> : <Share2 aria-hidden className="size-5" />}
      </IconButton>
      <span role="status" className="absolute top-full right-0 mt-1 text-xs whitespace-nowrap text-green-800">
        {copied ? t('share.copied') : ''}
      </span>
    </div>
  );
};

export default ShareButton;
