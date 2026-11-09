import type { Gallery } from '@/types';
import { isExpired } from './format.ts';

/** The one place that decides whether a gallery may be shown through its link (demo and server share it). */
export function accessState(g: Pick<Gallery, 'status' | 'settings'>, now = Date.now()): 'ok' | 'not-found' | 'expired' | 'locked' {
  if (g.status !== 'published') return 'not-found';
  if (isExpired(g.settings.expiresAt, now)) return 'expired';
  return g.settings.hasPassword ? 'locked' : 'ok';
}

/** Validates a client's selection against the gallery rules; returns the cleaned list or throws a readable error. */
export function cleanSelection(photoIds: string[], validIds: Set<string>, limit: number | null): string[] {
  const unique = [...new Set(photoIds)].filter((id) => validIds.has(id));
  if (limit != null && unique.length > limit) throw new Error(`O limite desta seleção é de ${limit} fotografias.`);
  return unique;
}

/** Safe file name for a downloaded original: "helena-rafael-007.jpg". */
export function downloadName(gallerySlug: string, position: number, original: string): string {
  const ext = (original.match(/\.(jpe?g|png|webp)$/i)?.[1] ?? 'jpg').toLowerCase();
  const base = gallerySlug.replace(/-[a-z2-9]{8}$/, '');
  return `${base}-${String(position + 1).padStart(3, '0')}.${ext}`;
}
