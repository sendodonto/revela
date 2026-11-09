'use client';
import { AnimatePresence, motion } from 'motion/react';
import { Check, CircleAlert } from 'lucide-react';
import { useToasts } from '@/store/toast';

/** Toasts rise in and sink out along the same path; the stack re-flows with a critically damped spring. */
export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-[90] flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            role={t.tone === 'error' ? 'alert' : 'status'}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="flex max-w-md items-center gap-2.5 rounded-full bg-ink px-4 py-3 text-[14px] text-wall shadow-[var(--shadow-float)]"
          >
            {t.tone === 'ok' ? <Check size={16} aria-hidden /> : <CircleAlert size={16} className="text-[#f2a99c]" aria-hidden />}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
