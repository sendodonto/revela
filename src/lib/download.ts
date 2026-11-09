import { Zip, ZipPassThrough } from 'fflate';

/** Hands a blob to the browser's download manager. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function fetchBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Falha ao baixar (${res.status}).`);
  return res.blob();
}

export interface ZipEntry { name: string; url: string }

/**
 * Builds a ZIP in the browser from the photos' original URLs. Photos are stored, not recompressed (JPEGs don't shrink).
 * shortcut: the archive is assembled in memory, fine for a few GB on desktop; stream to disk (showSaveFilePicker) if galleries grow past that.
 */
export async function zipFromUrls(entries: ZipEntry[], onProgress: (done: number, total: number) => void, signal?: AbortSignal): Promise<Blob> {
  const chunks: Uint8Array[] = [];
  let failed: unknown = null;
  const zip = new Zip((err, chunk) => {
    if (err) failed = err;
    else chunks.push(chunk);
  });
  const used = new Set<string>();
  let done = 0;
  onProgress(0, entries.length);
  for (const entry of entries) {
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
    const data = new Uint8Array(await (await fetchBlob(entry.url, signal)).arrayBuffer());
    let name = entry.name;
    for (let i = 2; used.has(name); i++) name = entry.name.replace(/(\.[^.]+)?$/, `-${i}$1`);
    used.add(name);
    const file = new ZipPassThrough(name);
    zip.add(file);
    file.push(data, true);
    onProgress(++done, entries.length);
  }
  zip.end();
  if (failed) throw failed;
  return new Blob(chunks as BlobPart[], { type: 'application/zip' });
}
