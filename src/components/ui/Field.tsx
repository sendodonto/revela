import { useId } from 'react';

const control = 'w-full rounded-[10px] border border-rule-2 bg-paper px-3.5 text-[16px] text-ink sm:text-[15px] placeholder:text-ink-3 transition-colors hover:border-ink/30 focus:border-ink focus:outline-none disabled:bg-wall-2 aria-[invalid=true]:border-danger';

interface FieldProps { label: string; hint?: string; error?: string | null; className?: string }

export function Input({ label, hint, error, className = '', ...rest }: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</label>
      <input id={id} aria-invalid={!!error || undefined} aria-describedby={hint || error ? `${id}-d` : undefined} className={`${control} h-11`} {...rest} />
      {(error || hint) && <p id={`${id}-d`} className={`mt-1.5 text-[13px] ${error ? 'text-danger' : 'text-ink-3'}`}>{error || hint}</p>}
    </div>
  );
}

export function Textarea({ label, hint, error, className = '', ...rest }: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</label>
      <textarea id={id} aria-invalid={!!error || undefined} aria-describedby={hint || error ? `${id}-d` : undefined} className={`${control} min-h-24 py-2.5 leading-relaxed`} {...rest} />
      {(error || hint) && <p id={`${id}-d`} className={`mt-1.5 text-[13px] ${error ? 'text-danger' : 'text-ink-3'}`}>{error || hint}</p>}
    </div>
  );
}
