import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import IconButton from '../design-system/IconButton';
import { cx } from '../design-system/cx';

export type SheetSnap = 'collapsed' | 'half' | 'full';

const NEXT_SNAP: Record<SheetSnap, SheetSnap> = { collapsed: 'half', half: 'full', full: 'collapsed' };

/** Déplacement (px) en dessous duquel un geste sur la poignée est un simple appui */
const TAP_THRESHOLD = 6;

interface BottomSheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** Hauteur visible (px) de chaque cran */
  heights: Record<SheetSnap, number>;
  label: string;
  /** Résumé toujours visible, même replié */
  header: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Volet glissant depuis le bas (mobile) à trois crans : replié (résumé),
 * mi-hauteur (la carte reste visible au-dessus), plein écran.
 * Poignée : glisser, ou appuyer pour passer au cran suivant ; bouton pour le clavier.
 */
const BottomSheet: React.FC<BottomSheetProps> = ({ snap, onSnapChange, heights, label, header, children }) => {
  const { t } = useTranslation();
  const [drag, setDrag] = useState<{ startY: number; startHeight: number; height: number } | null>(null);
  const height = drag ? drag.height : heights[snap];

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ startY: e.clientY, startHeight: heights[snap], height: heights[snap] });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const next = Math.min(heights.full, Math.max(heights.collapsed, drag.startHeight + drag.startY - e.clientY));
    setDrag({ ...drag, height: next });
  };

  const onPointerUp = () => {
    if (!drag) return;
    const moved = drag.height - drag.startHeight;
    if (Math.abs(moved) < TAP_THRESHOLD) {
      onSnapChange(NEXT_SNAP[snap]);
    } else {
      // Cran le plus proche, en privilégiant le sens du geste
      const candidates = (Object.keys(heights) as SheetSnap[]).filter((s) =>
        moved > 0 ? heights[s] >= drag.startHeight : heights[s] <= drag.startHeight
      );
      const nearest = candidates.reduce((best, s) =>
        Math.abs(heights[s] - drag.height) < Math.abs(heights[best] - drag.height) ? s : best
      );
      onSnapChange(nearest);
    }
    setDrag(null);
  };

  return (
    <section
      aria-label={label}
      className="absolute inset-x-0 bottom-0 z-[1100] flex flex-col rounded-t-2xl bg-white shadow-[0_-8px_24px_rgb(15_23_42/0.18)] ring-1 ring-slate-900/10"
      style={{ height, transition: drag ? 'none' : 'height 200ms ease' }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="shrink-0 cursor-grab touch-none px-4 pt-2 pb-2 select-none active:cursor-grabbing"
      >
        <div aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-slate-300" />
        <div className="mt-1.5 flex min-h-10 items-center gap-2">
          <div className="min-w-0 flex-1">{header}</div>
          <IconButton
            label={snap === 'full' ? t('panel.sheetCollapse') : t('panel.sheetExpand')}
            aria-expanded={snap !== 'collapsed'}
            size="sm"
            onClick={() => onSnapChange(NEXT_SNAP[snap])}
          >
            {snap === 'full' ? <ChevronDown aria-hidden className="size-5" /> : <ChevronUp aria-hidden className="size-5" />}
          </IconButton>
        </div>
      </div>
      {/* Replié : contenu masqué (ni visible ni atteignable au clavier) */}
      <div
        className={cx(
          'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-6',
          snap === 'collapsed' && !drag && 'invisible'
        )}
      >
        {children}
      </div>
    </section>
  );
};

export default BottomSheet;
