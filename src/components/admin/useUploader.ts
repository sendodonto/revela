'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LIMITS } from '@/lib/config';
import { processImage, rejectReason } from '@/lib/image';
import { getAdmin } from '@/services';
import type { Photo } from '@/types';

export interface UploadItem {
  id: string;
  file: File;
  status: 'waiting' | 'processing' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

const CONCURRENCY = 3;

/**
 * Upload queue: validates each file, renders thumbnails in the browser, uploads original + sizes with real progress,
 * runs three at a time, and keeps failures in the list with a retry instead of losing them.
 */
export function useUploader(galleryId: string, onUploaded: (p: Photo) => void) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const running = useRef(0);
  const queue = useRef<UploadItem[]>([]);
  const onUploadedRef = useRef(onUploaded);
  onUploadedRef.current = onUploaded;

  const patch = useCallback((id: string, p: Partial<UploadItem>) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...p } : it))), []);

  const pump = useCallback(() => {
    while (running.current < CONCURRENCY && queue.current.length) {
      const item = queue.current.shift()!;
      running.current++;
      (async () => {
        try {
          patch(item.id, { status: 'processing', progress: 0.02, error: undefined });
          const processed = await processImage(item.file);
          patch(item.id, { status: 'uploading', progress: 0.05 });
          const photo = await getAdmin().uploadPhoto(galleryId, item.file, processed, (f) => patch(item.id, { progress: 0.05 + f * 0.95 }));
          patch(item.id, { status: 'done', progress: 1 });
          onUploadedRef.current(photo);
        } catch (e) {
          patch(item.id, { status: 'error', error: e instanceof Error ? e.message : 'Falha no envio.' });
        } finally {
          running.current--;
          pump();
        }
      })();
    }
  }, [galleryId, patch]);

  const add = useCallback((files: File[]): string | null => {
    if (files.length > LIMITS.maxFilesPerBatch) return `Envie no máximo ${LIMITS.maxFilesPerBatch} fotos por vez.`;
    const fresh: UploadItem[] = files.map((file) => {
      const reason = rejectReason(file);
      return { id: crypto.randomUUID(), file, status: reason ? 'error' : 'waiting', progress: 0, error: reason ?? undefined };
    });
    setItems((list) => [...list.filter((i) => i.status !== 'done'), ...fresh]);
    queue.current.push(...fresh.filter((i) => i.status === 'waiting'));
    pump();
    return null;
  }, [pump]);

  const retry = useCallback((id: string) => {
    setItems((list) => {
      const it = list.find((x) => x.id === id);
      if (it && !rejectReason(it.file)) {
        queue.current.push(it);
        queueMicrotask(pump);
        return list.map((x) => (x.id === id ? { ...x, status: 'waiting', progress: 0, error: undefined } : x));
      }
      return list;
    });
  }, [pump]);

  const clearFinished = useCallback(() => setItems((list) => list.filter((i) => i.status !== 'done' && i.status !== 'error')), []);
  const busy = items.some((i) => i.status === 'waiting' || i.status === 'processing' || i.status === 'uploading');

  // Leaving mid-upload would silently drop files: ask first.
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);

  return { items, add, retry, clearFinished, busy };
}
