const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** URL-safe slug from a client name plus an unguessable suffix: "Ana & Pedro" -> "ana-e-pedro-x8k29qhm". */
export function gallerySlug(clientName: string, suffixLength = 8): string {
  const base = clientName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  const bytes = crypto.getRandomValues(new Uint8Array(suffixLength));
  const suffix = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return base ? `${base}-${suffix}` : `galeria-${suffix}`;
}
