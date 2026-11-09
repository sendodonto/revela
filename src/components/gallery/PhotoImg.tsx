'use client';
import { useState } from 'react';

/**
 * Progressive photograph: the inline blur paints instantly, the real file fades up once decoded.
 * Square corners on purpose: prints on a wall, not cards.
 */
export function PhotoImg({ src, blur, alt, className = '', imgClassName = '', sizes, eager, fit = 'cover', style }: {
  src: string;
  blur: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  eager?: boolean;
  fit?: 'cover' | 'contain';
  style?: React.CSSProperties;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative '}overflow-hidden bg-wall-2 ${className}`}
      style={{ ...style, backgroundImage: blur ? `url(${blur})` : undefined, backgroundSize: fit, backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- signed / blob URLs, sizes generated at upload */}
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={eager ? 'high' : undefined}
        draggable={false}
        data-loaded={loaded}
        ref={(el) => {
          if (el?.complete && el.naturalWidth) setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
        className={`photo-img absolute inset-0 size-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${imgClassName}`}
      />
    </div>
  );
}
