import { LIMITS } from './config';

export interface ProcessedImage {
  width: number;
  height: number;
  display: Blob;
  thumb: Blob;
  blur: string;
}

/** Returns a guest-readable reason the file can't be uploaded, or null when it's acceptable. */
export function rejectReason(file: File): string | null {
  if (!LIMITS.accepted.includes(file.type)) {
    return /heic|heif/i.test(file.type + file.name) ? 'HEIC não é aceito. Exporte em JPEG.' : 'Formato não aceito. Use JPEG, PNG ou WebP.';
  }
  if (file.size > LIMITS.maxUploadMB * 1024 * 1024) return `Maior que ${LIMITS.maxUploadMB} MB.`;
  return null;
}

async function resize(bitmap: ImageBitmap, edge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality));
  if (!blob) throw new Error('Não foi possível gerar a miniatura.');
  return blob;
}

/** Decodes the original (respecting EXIF orientation) and renders the display size, thumbnail and inline blur. */
export async function processImage(file: Blob): Promise<ProcessedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Arquivo de imagem corrompido ou ilegível.');
  }
  try {
    const [display, thumb, tiny] = await Promise.all([resize(bitmap, 1600, 0.82), resize(bitmap, 640, 0.74), resize(bitmap, 16, 0.4)]);
    const blur = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(tiny);
    });
    return { width: bitmap.width, height: bitmap.height, display, thumb, blur };
  } finally {
    bitmap.close();
  }
}
