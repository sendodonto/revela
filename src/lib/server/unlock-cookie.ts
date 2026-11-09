import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

const secret = () => {
  const s = process.env.GALLERY_COOKIE_SECRET;
  if (!s || s.length < 32) throw new Error('GALLERY_COOKIE_SECRET must be set (32+ chars).');
  return s;
};

export const cookieName = (galleryId: string) => `rv_${galleryId.replace(/-/g, '').slice(0, 16)}`;

/** Token bound to the gallery and the current password: changing the password invalidates every unlock. */
export const unlockToken = (galleryId: string, fingerprint: string) => createHmac('sha256', secret()).update(`${galleryId}:${fingerprint}`).digest('base64url');

export function validToken(token: string | undefined, galleryId: string, fingerprint: string | null): boolean {
  if (!token || !fingerprint) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(unlockToken(galleryId, fingerprint));
  return a.length === b.length && timingSafeEqual(a, b);
}
