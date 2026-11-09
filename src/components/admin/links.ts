import { BASE, DEMO } from '@/lib/config';

/** Absolute client link for a gallery (the static demo needs the trailing slash its export uses). */
export const galleryUrl = (slug: string) =>
  `${typeof window === 'undefined' ? '' : window.location.origin}${BASE}/g/${slug}${DEMO ? '/' : ''}`;
