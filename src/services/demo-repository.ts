import { buildSeed, DEMO_LOGIN, DEMO_VERSION, type DemoDB, type DemoPhoto } from '@/data/seed';
import { asset } from '@/lib/config';
import { accessState, cleanSelection, downloadName } from '@/lib/rules';
import { gallerySlug } from '@/lib/slug';
import { visitorId } from '@/lib/visitor';
import type { Gallery, GallerySummary, Photo, PublicPhoto, Selection } from '@/types';
import { deleteBlob, putBlob, resolveBlobUrl } from './blob-store';
import type { AdminRepository, PublicRepository } from './repository';

// shortcut: demo mode keeps everything in this browser and checks passwords client-side; it shows the flows, not real security.
// Real installations use the Supabase repository plus the server API, where none of this runs in the client.

const KEY = 'revela:demo-db';
const SESSION = 'revela:demo-session';
const UNLOCKED = 'revela:demo-unlocked';

let cache: DemoDB | null = null;

function load(): DemoDB {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as DemoDB) : null;
    cache = parsed?.version === DEMO_VERSION ? parsed : buildSeed();
  } catch {
    cache = buildSeed();
  }
  return cache;
}

function commit(mutate: (db: DemoDB) => void) {
  const db = load();
  mutate(db);
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    throw new Error('Não foi possível salvar neste navegador (armazenamento cheio ou bloqueado).');
  }
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function fileUrl(ref: string): Promise<string> {
  return ref.startsWith('idb:') ? ((await resolveBlobUrl(ref)) ?? '') : asset(ref);
}

const strip = ({ files: _files, ...p }: DemoPhoto): Photo => p;
const now = () => new Date().toISOString();
const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

function readUnlocked(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(UNLOCKED) || '[]');
  } catch {
    return [];
  }
}

function galleryBySlug(slug: string) {
  return load().galleries.find((g) => g.slug === slug) ?? null;
}

/** Same rules as the server API: unpublished, expired or locked galleries expose nothing. */
function requireOpen(slug: string) {
  const g = galleryBySlug(slug);
  if (!g) throw new Error('Galeria não encontrada.');
  const state = accessState(g);
  if (state === 'locked' && readUnlocked().includes(g.id)) return g;
  if (state !== 'ok') throw new Error('Esta galeria não está disponível.');
  return g;
}

export function createDemoAdmin(): AdminRepository {
  const summary = (g: Gallery, db: DemoDB): GallerySummary => {
    const events = db.events.filter((e) => e.galleryId === g.id);
    const sum = (t: string) => events.filter((e) => e.type === t).reduce((s, e) => s + e.count, 0);
    return {
      ...g,
      photoCount: db.photos.filter((p) => p.galleryId === g.id).length,
      views: sum('view'),
      downloads: sum('download'),
      favorites: new Set((db.favoritesByGallery[g.id] ?? []).flatMap((f) => f.photoIds)).size,
      selectionsSubmitted: db.selections.filter((s) => s.galleryId === g.id && s.status === 'submitted').length,
    };
  };

  return {
    mode: 'demo',
    async signIn(email, password) {
      if (email.trim().toLowerCase() !== DEMO_LOGIN.email || password !== DEMO_LOGIN.password) throw new Error('E-mail ou senha incorretos.');
      localStorage.setItem(SESSION, JSON.stringify({ email: DEMO_LOGIN.email }));
    },
    async signOut() {
      localStorage.removeItem(SESSION);
    },
    async getSession() {
      try {
        return JSON.parse(localStorage.getItem(SESSION) || 'null');
      } catch {
        return null;
      }
    },

    async getStudio() {
      return load().studio;
    },
    async saveStudio(studio) {
      commit((db) => void (db.studio = studio));
    },
    async uploadBrandAsset(_kind, file) {
      return putBlob(file);
    },
    async brandUrl(ref) {
      return ref ? fileUrl(ref) : null;
    },

    async stats() {
      const db = load();
      return {
        galleries: db.galleries.length,
        published: db.galleries.filter((g) => g.status === 'published').length,
        photos: db.photos.length,
        bytes: db.photos.reduce((s, p) => s + p.bytes, 0),
        views: db.events.filter((e) => e.type === 'view').reduce((s, e) => s + e.count, 0),
        downloads: db.events.filter((e) => e.type === 'download').reduce((s, e) => s + e.count, 0),
      };
    },
    async listGalleries() {
      const db = load();
      return db.galleries.map((g) => summary(g, db)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async getGallery(id) {
      const g = load().galleries.find((x) => x.id === id);
      if (!g) return null;
      const { musicFile: _m, ...gallery } = g;
      return gallery;
    },
    async createGallery(input) {
      const g: DemoDB['galleries'][number] = {
        id: crypto.randomUUID(), slug: gallerySlug(input.clientName), title: input.title.trim(), clientName: input.clientName.trim(),
        description: input.description.trim(), eventDate: input.eventDate, coverPhotoId: null, status: 'draft',
        settings: { hasPassword: false, expiresAt: null, allowDownload: true, allowFavorites: true, allowSelection: false, selectionLimit: null, presentation: true, slideSeconds: 6, music: 'ambiente' },
        createdAt: now(), updatedAt: now(), musicFile: null,
      };
      commit((db) => db.galleries.push(g));
      const { musicFile: _m, ...gallery } = g;
      return gallery;
    },
    async updateGallery(gallery) {
      commit((db) => {
        const g = db.galleries.find((x) => x.id === gallery.id);
        if (!g) throw new Error('Galeria não encontrada.');
        // hasPassword only changes through setPassword.
        Object.assign(g, gallery, { settings: { ...gallery.settings, hasPassword: g.settings.hasPassword }, updatedAt: now() });
      });
    },
    async setPassword(galleryId, password) {
      const hash = password ? await sha256(`${galleryId}:${password}`) : null;
      commit((db) => {
        const g = db.galleries.find((x) => x.id === galleryId)!;
        g.settings.hasPassword = !!hash;
        if (hash) db.passwords[galleryId] = hash;
        else delete db.passwords[galleryId];
      });
    },
    async deleteGallery(id) {
      const db = load();
      const photos = db.photos.filter((p) => p.galleryId === id);
      // Files first: if a file can't be removed, the gallery stays and the photographer can retry.
      for (const p of photos) for (const ref of Object.values(p.files)) await deleteBlob(ref);
      const music = db.galleries.find((g) => g.id === id)?.musicFile;
      if (music) await deleteBlob(music);
      commit((d) => {
        d.galleries = d.galleries.filter((g) => g.id !== id);
        d.photos = d.photos.filter((p) => p.galleryId !== id);
        d.albums = d.albums.filter((a) => a.galleryId !== id);
        d.selections = d.selections.filter((s) => s.galleryId !== id);
        d.events = d.events.filter((e) => e.galleryId !== id);
        delete d.favoritesByGallery[id];
        delete d.passwords[id];
      });
    },
    async uploadMusic(galleryId, file) {
      const ref = await putBlob(file);
      const old = load().galleries.find((g) => g.id === galleryId)?.musicFile;
      commit((db) => {
        const g = db.galleries.find((x) => x.id === galleryId)!;
        g.musicFile = ref;
        g.settings.music = 'custom';
      });
      if (old) await deleteBlob(old);
    },

    async listPhotos(galleryId) {
      return load().photos.filter((p) => p.galleryId === galleryId).sort(byPosition).map(strip);
    },
    async uploadPhoto(galleryId, file, processed, onProgress) {
      // Real work in three steps, so progress reflects bytes actually stored in this browser.
      const original = await putBlob(file);
      onProgress(0.7);
      const display = await putBlob(processed.display);
      onProgress(0.9);
      const thumb = await putBlob(processed.thumb);
      const position = load().photos.filter((p) => p.galleryId === galleryId).length;
      const photo: DemoPhoto = {
        id: crypto.randomUUID(), galleryId, albumId: null, name: file.name, width: processed.width, height: processed.height,
        bytes: file.size, position, blur: processed.blur, createdAt: now(), files: { original, display, thumb },
      };
      commit((db) => {
        db.photos.push(photo);
        const g = db.galleries.find((x) => x.id === galleryId)!;
        g.coverPhotoId ??= photo.id;
        g.updatedAt = now();
      });
      onProgress(1);
      return strip(photo);
    },
    async deletePhotos(galleryId, ids) {
      const set = new Set(ids);
      const doomed = load().photos.filter((p) => p.galleryId === galleryId && set.has(p.id));
      for (const p of doomed) for (const ref of Object.values(p.files)) await deleteBlob(ref);
      commit((db) => {
        db.photos = db.photos.filter((p) => !set.has(p.id));
        db.photos.filter((p) => p.galleryId === galleryId).sort(byPosition).forEach((p, i) => (p.position = i));
        const g = db.galleries.find((x) => x.id === galleryId)!;
        if (g.coverPhotoId && set.has(g.coverPhotoId)) g.coverPhotoId = db.photos.find((p) => p.galleryId === galleryId)?.id ?? null;
        for (const f of db.favoritesByGallery[galleryId] ?? []) f.photoIds = f.photoIds.filter((id) => !set.has(id));
        for (const s of db.selections) if (s.galleryId === galleryId) s.photoIds = s.photoIds.filter((id) => !set.has(id));
      });
    },
    async reorderPhotos(galleryId, orderedIds) {
      const pos = new Map(orderedIds.map((id, i) => [id, i]));
      commit((db) => db.photos.forEach((p) => p.galleryId === galleryId && pos.has(p.id) && (p.position = pos.get(p.id)!)));
    },
    async movePhotos(galleryId, ids, albumId) {
      const set = new Set(ids);
      commit((db) => db.photos.forEach((p) => p.galleryId === galleryId && set.has(p.id) && (p.albumId = albumId)));
    },
    async photoUrls(photos, size) {
      const db = load();
      const byId = new Map(db.photos.map((p) => [p.id, p]));
      const out: Record<string, string> = {};
      await Promise.all(photos.map(async (p) => {
        const files = byId.get(p.id)?.files;
        if (files) out[p.id] = await fileUrl(files[size]);
      }));
      return out;
    },

    async listAlbums(galleryId) {
      return load().albums.filter((a) => a.galleryId === galleryId).sort(byPosition);
    },
    async createAlbum(galleryId, name) {
      const album = { id: crypto.randomUUID(), galleryId, name: name.trim(), position: load().albums.filter((a) => a.galleryId === galleryId).length };
      commit((db) => db.albums.push(album));
      return album;
    },
    async renameAlbum(albumId, name) {
      commit((db) => {
        const a = db.albums.find((x) => x.id === albumId);
        if (a) a.name = name.trim();
      });
    },
    async deleteAlbum(albumId) {
      commit((db) => {
        db.albums = db.albums.filter((a) => a.id !== albumId);
        db.photos.forEach((p) => p.albumId === albumId && (p.albumId = null));
      });
    },

    async listFavorites(galleryId) {
      return (load().favoritesByGallery[galleryId] ?? []).filter((f) => f.photoIds.length);
    },
    async listSelections(galleryId) {
      return load().selections.filter((s) => s.galleryId === galleryId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async reopenSelection(selectionId) {
      commit((db) => {
        const s = db.selections.find((x) => x.id === selectionId);
        if (s) Object.assign(s, { status: 'open', submittedAt: null, updatedAt: now() });
      });
    },
  };
}

export function createDemoPublic(): PublicRepository {
  const me = () => visitorId();
  const mySelection = (galleryId: string) => load().selections.find((s) => s.galleryId === galleryId && s.visitorId === me()) ?? null;

  const publicStudio = async () => {
    const s = load().studio;
    return { ...s, logo: s.logo ? await fileUrl(s.logo) : null, cover: s.cover ? await fileUrl(s.cover) : null };
  };

  return {
    studio: publicStudio,
    async open(slug, password) {
      const db = load();
      const g = galleryBySlug(slug);
      if (!g) return { status: 'not-found' };
      let state = accessState(g);
      if (state === 'not-found') return { status: 'not-found' };
      if (state === 'expired') return { status: 'expired', title: g.title, studio: await publicStudio() };
      if (state === 'locked') {
        if (password != null && (await sha256(`${g.id}:${password}`)) === db.passwords[g.id]) {
          sessionStorage.setItem(UNLOCKED, JSON.stringify([...new Set([...readUnlocked(), g.id])]));
        }
        if (!readUnlocked().includes(g.id)) return { status: 'locked', title: g.title, studio: await publicStudio(), wrongPassword: password != null };
        state = 'ok';
      }
      const photos = db.photos.filter((p) => p.galleryId === g.id).sort(byPosition);
      const publicPhotos: PublicPhoto[] = await Promise.all(photos.map(async (p) => ({ ...strip(p), thumb: await fileUrl(p.files.thumb), display: await fileUrl(p.files.display) })));
      const { status: _s, musicFile, ...gallery } = g;
      const musicUrl = g.settings.music === 'custom' && musicFile ? await fileUrl(musicFile) : g.settings.music === 'ambiente' ? asset('/demo/music/ambiente.mp3') : null;
      const studio = await publicStudio();
      return { status: 'ok', data: { gallery, studio, albums: db.albums.filter((a) => a.galleryId === g.id).sort(byPosition), photos: publicPhotos, musicUrl } };
    },
    async originals(slug, photoIds) {
      const g = requireOpen(slug);
      if (!g.settings.allowDownload) throw new Error('O fotógrafo não liberou downloads nesta galeria.');
      const wanted = photoIds === 'all' ? null : new Set(photoIds);
      const photos = load().photos.filter((p) => p.galleryId === g.id && (!wanted || wanted.has(p.id))).sort(byPosition);
      return Promise.all(photos.map(async (p) => ({ id: p.id, name: downloadName(g.slug, p.position, p.name), url: await fileUrl(p.files.original) })));
    },
    async getFavorites(slug) {
      const g = requireOpen(slug);
      return load().favoritesByGallery[g.id]?.find((f) => f.visitorId === me())?.photoIds ?? [];
    },
    async setFavorite(slug, photoId, on) {
      const g = requireOpen(slug);
      if (!g.settings.allowFavorites) throw new Error('Favoritas estão desativadas nesta galeria.');
      if (!load().photos.some((p) => p.id === photoId && p.galleryId === g.id)) throw new Error('Foto não encontrada.');
      commit((db) => {
        const list = (db.favoritesByGallery[g.id] ??= []);
        let mine = list.find((f) => f.visitorId === me());
        if (!mine) list.push((mine = { visitorId: me(), label: `Visitante ${list.length + 1}`, photoIds: [], updatedAt: now() }));
        mine.photoIds = on ? [...new Set([...mine.photoIds, photoId])] : mine.photoIds.filter((id) => id !== photoId);
        mine.updatedAt = now();
      });
    },
    async getSelection(slug) {
      return mySelection(requireOpen(slug).id);
    },
    async saveSelection(slug, photoIds) {
      const g = requireOpen(slug);
      if (!g.settings.allowSelection) throw new Error('A seleção não está ativa nesta galeria.');
      const current = mySelection(g.id);
      if (current?.status === 'submitted') throw new Error('Sua seleção já foi enviada. Peça ao fotógrafo para reabrir.');
      const valid = new Set(load().photos.filter((p) => p.galleryId === g.id).map((p) => p.id));
      const clean = cleanSelection(photoIds, valid, g.settings.selectionLimit);
      const next: Selection = current
        ? { ...current, photoIds: clean, updatedAt: now() }
        : { id: crypto.randomUUID(), galleryId: g.id, visitorId: me(), clientName: '', note: '', photoIds: clean, status: 'open', submittedAt: null, updatedAt: now() };
      commit((db) => {
        db.selections = [...db.selections.filter((s) => s.id !== next.id), next];
      });
      return next;
    },
    async submitSelection(slug, clientName, note) {
      const g = requireOpen(slug);
      const current = mySelection(g.id);
      if (!current?.photoIds.length) throw new Error('Escolha pelo menos uma fotografia antes de enviar.');
      if (!clientName.trim()) throw new Error('Informe seu nome para o fotógrafo saber de quem é a seleção.');
      const next: Selection = { ...current, clientName: clientName.trim().slice(0, 80), note: note.trim().slice(0, 1000), status: 'submitted', submittedAt: now(), updatedAt: now() };
      commit((db) => {
        db.selections = db.selections.map((s) => (s.id === next.id ? next : s));
      });
      return next;
    },
    async logEvent(slug, type, count = 1) {
      const g = galleryBySlug(slug);
      if (!g) return;
      commit((db) => db.events.push({ galleryId: g.id, type, count, at: now() }));
    },
  };
}
