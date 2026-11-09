'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const project = (v: number, d = 0.998) => ((v / 1000) * d) / (1 - d);
const rubberband = (o: number, dim: number, c = 0.55) => (o * dim * c) / (dim + c * Math.abs(o));

/**
 * Native <dialog>: focus trap, Esc and backdrop close come from the platform.
 * Bottom sheet on phones (grab the top edge and pull down to dismiss, with momentum), centered panel from sm up;
 * enters and leaves along the same path.
 */
export function Sheet({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'md' | 'lg' }) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ y0: number; last: number; t: number; v: number } | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.style.transform = '';
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const phone = () => matchMedia('(max-width: 639px)').matches;
  const onDown = (e: React.PointerEvent) => {
    if (!phone() || (e.target as HTMLElement).closest('button')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, last: e.clientY, t: performance.now(), v: 0 };
    ref.current!.style.transition = 'none';
  };
  const onMove = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g) return;
    const now = performance.now();
    g.v = ((e.clientY - g.last) / Math.max(1, now - g.t)) * 1000;
    g.last = e.clientY;
    g.t = now;
    const dy = e.clientY - g.y0;
    // Follows the finger 1:1 downward; resists upward.
    ref.current!.style.transform = `translateY(${dy >= 0 ? dy : rubberband(dy, 400)}px)`;
  };
  const onUp = (e: React.PointerEvent) => {
    const g = drag.current;
    drag.current = null;
    const d = ref.current;
    if (!g || !d) return;
    const dy = e.clientY - g.y0;
    d.style.transition = '';
    if (dy + project(g.v) > d.offsetHeight * 0.35) {
      d.style.transform = 'translateY(100%)';
      setTimeout(onClose, 220);
    } else d.style.transform = '';
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={`sheet m-0 mt-auto w-full max-w-none rounded-t-[22px] bg-paper p-0 text-ink shadow-[var(--shadow-sheet)] sm:m-auto sm:rounded-[18px] ${size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
    >
      <div className="max-h-[88dvh] overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),20px)] sm:px-7 sm:pb-7 sm:pt-6">
        <div className="sticky top-0 z-10 -mx-5 touch-none bg-paper px-5 pt-2 sm:static sm:mx-0 sm:touch-auto sm:px-0 sm:pt-0" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-rule-2 sm:hidden" aria-hidden />
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="pt-1.5 text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Fechar" className="press -mr-2 grid size-11 place-items-center rounded-full text-ink-2 hover:bg-ink/[0.06]">
              <X size={20} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </dialog>
  );
}
