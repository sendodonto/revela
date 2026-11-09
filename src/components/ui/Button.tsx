import { forwardRef } from 'react';
import { LoaderCircle } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-wall hover:bg-[#2a2a28] disabled:bg-ink/40',
  secondary: 'border border-rule-2 bg-paper text-ink hover:border-ink/40 disabled:text-ink-3',
  ghost: 'text-ink hover:bg-ink/[0.05] disabled:text-ink-3',
  danger: 'bg-danger text-white hover:bg-[#8a1f16] disabled:opacity-50',
  light: 'bg-white text-ink hover:bg-white/90 disabled:opacity-60',
};
const iconSizes: Record<Size, string> = { sm: 'size-9', md: 'size-11', lg: 'size-12' };
const sizes: Record<Size, string> = {
  sm: 'h-9 gap-1.5 px-3.5 text-[13px]',
  md: 'h-11 gap-2 px-5 text-[14px]',
  lg: 'h-12 gap-2 px-6 text-[15px]',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, loading, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`press inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full font-medium disabled:cursor-not-allowed ${variants[variant]} ${children ? sizes[size] : iconSizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

/** Round icon-only button; always carries an accessible label. */
export function IconButton({ label, className = '', children, type = 'button', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type={type} aria-label={label} title={label} className={`press grid size-11 shrink-0 place-items-center rounded-full ${className}`} {...rest}>
      {children}
    </button>
  );
}
