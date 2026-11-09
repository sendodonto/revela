const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const numFmt = new Intl.NumberFormat('pt-BR');

/** "2026-03-14" -> "14 de março de 2026" (date-only values are UTC so they never shift a day). */
export const formatDate = (iso: string) => dateFmt.format(new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso));
export const formatShortDate = (iso: string) => shortFmt.format(new Date(iso)).replace('.', '');
export const formatNumber = (n: number) => numFmt.format(n);

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  return `${(bytes / 1024 ** 3).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} GB`;
}

/** plural(3, 'fotografia', 'fotografias') -> "3 fotografias" */
export const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`;

export function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return days === 1 ? 'ontem' : `há ${days} dias`;
  return formatShortDate(iso);
}

export const isExpired = (expiresAt: string | null, now = Date.now()) => !!expiresAt && new Date(expiresAt).getTime() < now;
