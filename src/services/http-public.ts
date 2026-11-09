import { visitorId } from '@/lib/visitor';
import type { OpenResult, Selection, Studio } from '@/types';
import type { OriginalFile, PublicRepository } from './repository';

/** Client side of a real installation: every call goes through /api/g/<slug>, which enforces the gallery rules. */
async function call<T>(slug: string, action: string, payload: object = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/g/${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action, visitorId: visitorId(), ...payload }),
    });
  } catch {
    throw new Error('Sem conexão. Verifique a internet e tente de novo.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Erro ${res.status}.`);
  return data as T;
}

export function createHttpPublic(): PublicRepository {
  return {
    studio: async () => {
      const res = await fetch('/api/studio').catch(() => null);
      if (!res?.ok) throw new Error('Não foi possível carregar o estúdio.');
      return res.json();
    },
    open: (slug, password) => call<OpenResult>(slug, 'open', password != null ? { password } : {}),
    originals: (slug, photoIds) => call<OriginalFile[]>(slug, 'originals', { photoIds }),
    getFavorites: (slug) => call<string[]>(slug, 'favorites:get'),
    setFavorite: async (slug, photoId, on) => void (await call(slug, 'favorite:set', { photoId, on })),
    getSelection: (slug) => call<Selection | null>(slug, 'selection:get'),
    saveSelection: (slug, photoIds) => call<Selection>(slug, 'selection:save', { photoIds }),
    submitSelection: (slug, clientName, note) => call<Selection>(slug, 'selection:submit', { clientName, note }),
    logEvent: async (slug, type, count = 1) => void (await call(slug, 'event', { type, count }).catch(() => {})),
  };
}
