import { useId } from 'react';

/** A labelled on/off row: label and description on the left, the switch on the right. */
export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[15px] font-medium text-ink">{label}</label>
        {description && <p id={`${id}-d`} className="mt-0.5 text-[13px] leading-relaxed text-ink-3">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${checked ? 'bg-ink' : 'bg-rule-2'}`}
      >
        <span className={`absolute left-0.5 top-0.5 block size-6 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-300 ease-[var(--ease-settle)] ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
