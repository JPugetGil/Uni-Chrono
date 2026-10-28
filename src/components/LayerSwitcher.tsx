import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers } from 'lucide-react';
import { cx } from '../design-system/cx';
import { focusRing } from '../design-system/Button';
import MapControl from './MapControl';
import { BASE_LAYERS, BaseLayer, Overlays } from '../types/layers';

interface LayerSwitcherProps {
  base: BaseLayer;
  onBaseChange: (base: BaseLayer) => void;
  overlays: Overlays;
  onOverlaysChange: (overlays: Overlays) => void;
}

/** Choix du fond de carte et des calques CROUS, dans un panneau ouvert depuis un bouton de la carte */
const LayerSwitcher: React.FC<LayerSwitcherProps> = ({ base, onBaseChange, overlays, onOverlaysChange }) => {
  const { t } = useTranslation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Fermeture au clic en dehors et sur Échap
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <MapControl position="topright" className="leaflet-bar">
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-label={t('layers.title')}
          title={t('layers.title')}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className={cx(
            'flex size-[30px] items-center justify-center rounded-[4px] bg-white text-slate-800 hover:bg-slate-50',
            focusRing,
            open && 'bg-slate-100'
          )}
        >
          <Layers aria-hidden className="size-4" />
        </button>
        <div
          id={panelId}
          hidden={!open}
          className="absolute top-0 right-full mr-2 w-60 rounded-xl bg-white p-3 text-sm text-slate-800 shadow-xl ring-1 ring-slate-900/10"
        >
          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-slate-600">{t('layers.base')}</legend>
            {BASE_LAYERS.map((layer) => (
              <label key={layer} className="flex cursor-pointer items-center gap-2 py-1">
                <input
                  type="radio"
                  name={`${panelId}-base`}
                  checked={base === layer}
                  onChange={() => onBaseChange(layer)}
                  className="size-4 accent-blue-700"
                />
                {t(`layers.${layer}`)}
              </label>
            ))}
          </fieldset>
          <fieldset className="mt-3 border-t border-slate-200 pt-2">
            <legend className="mb-1.5 pt-1 text-xs font-semibold text-slate-600">{t('layers.overlays')}</legend>
            {(['crousLogements', 'crousRestaurants'] as const).map((overlay) => (
              <label key={overlay} className="flex cursor-pointer items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={overlays[overlay]}
                  onChange={(e) => onOverlaysChange({ ...overlays, [overlay]: e.target.checked })}
                  className="size-4 accent-blue-700"
                />
                {t(`layers.${overlay}`)}
              </label>
            ))}
            <p className="mt-1 text-xs text-slate-500">{t('layers.crousHint')}</p>
          </fieldset>
        </div>
      </div>
    </MapControl>
  );
};

export default LayerSwitcher;
