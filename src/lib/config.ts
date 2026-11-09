export const DEMO = process.env.NEXT_PUBLIC_DEMO === '1' || !process.env.NEXT_PUBLIC_SUPABASE_URL;
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Prefixes site-relative asset paths with the deploy base path; leaves absolute, blob and data URLs alone. */
export const asset = (src: string) => (src.startsWith('/') && !src.startsWith('//') ? BASE + src : src);

export const LIMITS = {
  maxUploadMB: Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB) || 40,
  maxFilesPerBatch: Number(process.env.NEXT_PUBLIC_MAX_FILES_PER_BATCH) || 300,
  accepted: ['image/jpeg', 'image/png', 'image/webp'],
};
