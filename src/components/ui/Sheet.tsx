'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Native <dialog>: focus trap, Esc and backdrop close come from the platform.
 * Bottom sheet on phones, centered panel from sm up; enters and leaves along the same path.
 */
export function Sheet({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'md' | 'lg' }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={`sheet m-0 mt-auto w-full max-w-none rounded-t-[22px] bg-paper p-0 text-ink shadow-[var(--shadow-sheet)] sm:m-auto sm:rounded-[18px] ${size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
    >
      <div className="max-h-[88dvh] overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-5 sm:px-7 sm:pb-7 sm:pt-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="pt-1.5 text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="press -mr-2 grid size-10 place-items-center rounded-full text-ink-2 hover:bg-ink/[0.06]">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
