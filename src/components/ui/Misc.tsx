export function Progress({ value, label, className = '', tone = 'ink' }: { value: number; label: string; className?: string; tone?: 'ink' | 'light' }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className={`h-[3px] overflow-hidden rounded-full ${tone === 'ink' ? 'bg-rule' : 'bg-white/20'} ${className}`}>
      <div className={`h-full origin-left transition-transform duration-300 ease-out ${tone === 'ink' ? 'bg-ink' : 'bg-white'}`} style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  );
}

/** Empty and error states: what happened, what to do, and the action itself. */
export function Empty({ icon, title, children, action }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-16 text-center">
      {icon && <div className="mb-4 text-ink-3" aria-hidden>{icon}</div>}
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {children && <div className="mt-2 text-[15px] leading-relaxed text-ink-3">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
