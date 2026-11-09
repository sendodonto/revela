import type { Studio } from '@/types';

/** The photographer's logo if uploaded, otherwise the studio name set as a wordmark. */
export function StudioMark({ studio, tone = 'ink', className = '' }: { studio: Pick<Studio, 'name' | 'logo'>; tone?: 'ink' | 'light'; className?: string }) {
  if (studio.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={studio.logo} alt={studio.name} className={`h-8 w-auto max-w-[180px] object-contain object-left ${tone === 'light' ? 'brightness-0 invert' : ''} ${className}`} />
    );
  }
  return <span className={`text-[14px] font-medium tracking-[0.01em] ${tone === 'light' ? 'text-white' : 'text-ink'} ${className}`}>{studio.name}</span>;
}
