import { Component } from 'react';
import { useTranslation } from 'react-i18next';
import { TriangleAlert } from 'lucide-react';
import Button from '../design-system/Button';

const ErrorFallback: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex h-dvh items-center justify-center p-6">
      <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl ring-1 ring-slate-900/10">
        <TriangleAlert aria-hidden className="mx-auto size-8 text-red-700" />
        <h1 className="mt-3 text-lg font-semibold text-slate-900">{t('error.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('error.description')}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          {t('error.reload')}
        </Button>
      </div>
    </div>
  );
};

/** Erreur de rendu inattendue : message et rechargement plutôt qu'une page blanche. */
class ErrorBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    return this.state.failed ? <ErrorFallback /> : this.props.children;
  }
}

export default ErrorBoundary;
