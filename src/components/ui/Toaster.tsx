'use client';
import { Check, CircleAlert } from 'lucide-react';
import { useToasts } from '@/store/toast';

export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-[90] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className="rise flex max-w-md items-center gap-2.5 rounded-full bg-ink px-4 py-3 text-[14px] text-wall shadow-[var(--shadow-float)]">
          {t.tone === 'ok' ? <Check size={16} aria-hidden /> : <CircleAlert size={16} className="text-[#f2a99c]" aria-hidden />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
