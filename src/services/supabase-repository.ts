import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { gallerySlug } from '@/lib/slug';
import type { Album, Gallery, GallerySummary, Photo, Selection, Studio, VisitorFavorites } from '@/types';
import type { AdminRepository } from './repository';

const BUCKET = 'galleries';
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export const toGallery = (r: Row): Gallery => ({
  id: r.id, slug: r.slug, title: r.title, clientName: r.client_name, description: r.description, eventDate: r.event_date,
  coverPhotoId: r.cover_photo_id, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at,
  settings: {
    hasPassword: r.has_password, expiresAt: r.expires_at, allowDownload: r.allow_download, allowFavorites: r.allow_favorites,
    allowSelection: r.allow_selection, selectionLimit: r.selection_limit, presentation: r.presentation, slideSeconds: r.slide_seconds, music: r.music,
  },
});
export const toPhoto = (r: Row): Photo => ({
  id: r.id, galleryId: r.gallery_id, albumId: r.album_id, name: r.name, width: r.width, height: r.height, bytes: r.bytes,
  position: r.position, blur: r.blur, createdAt: r.created_at,
});
export const toAlbum = (r: Row): Album => ({ id: r.id, galleryId: r.gallery_id, name: r.name, position: r.position });
export const toSelection = (r: Row): Selection => ({
  id: r.id, galleryId: r.gallery_id, visitorId: r.visitor_id, clientName: r.client_name, note: r.note, photoIds: r.photo_ids ?? [],
  status: r.status, submittedAt: r.submitted_at, updatedAt: r.updated_at,
});
export const toStudio = (r: Row | null): Studio => ({
  name: r?.name ?? '', photographerName: r?.photographer_name ?? '', logo: r?.logo_path ?? null, cover: r?.cover_path ?? null,
  accent: r?.accent ?? '#a33a2a', email: r?.email ?? '', phone: r?.phone ?? '', instagram: r?.instagram ?? '', website: r?.website ?? '', city: r?.city ?? '',
});
export const photoPaths = (r: Row) => ({
  original: `${r.storage_prefix}/original.${r.original_ext}`,
  display: `${r.storage_prefix}/display.webp`,
  thumb: `${r.storage_prefix}/thumb.webp`,
});

function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Storage upload with real byte progress (supabase-js has no progress callback). */
function xhrUpload(path: string, file: Blob, token: string, onProgress: (f: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${URL_}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', ANON);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Falha no envio (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error('Sem conexão. O envio foi interrompido.'));
    xhr.send(file);
  });
}

export function createSupabaseAdmin(): AdminRepository {
  const sb: SupabaseClient = createClient(URL_, ANON);
  const uid = async () => {
    const { data } = await sb.auth.getUser();
    if (!data.user) throw new Error('Sessão expirada. Entre novamente.');
    return data.user.id;
  };
  const sign = async (paths: string[]) => {
    if (!paths.length) return [] as (string | null)[];
    const data = check(await sb.storage.from(BUCKET).createSignedUrls(paths, 3600));
    return (data ?? []).map((d) => d.signedUrl ?? null);
  };
  const removeObjects = async (paths: string[]) => {
    for (let i = 0; i < paths.length; i += 100) check(await sb.storage.from(BUCKET).remove(paths.slice(i, i + 100)));
  };

  return {
    mode: 'supabase',
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async getSession() {
      const { data } = await sb.auth.getSession();
      return data.session ? { email: data.session.user.email ?? '' } : null;
    },

    async getStudio() {
      return toStudio(check(await sb.from('studios').select('*').maybeSingle()));
    },
    async saveStudio(s) {
      check(await sb.from('studios').upsert({
        owner: await uid(), name: s.name, photographer_name: s.photographerName, logo_path: s.logo, cover_path: s.cover, accent: s.accent,
        email: s.email, phone: s.phone, instagram: s.instagram, website: s.website, city: s.city, updated_at: new Date().toISOString(),
      }));
    },
    async uploadBrandAsset(kind, file) {
      const path = `${await uid()}/brand/${kind}-${Date.now()}.${EXT[file.type] ?? 'png'}`;
      check(await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type }));
      return path;
    },
    async brandUrl(ref) {
      return ref ? (await sign([ref]))[0] : null;
    },

    async stats() {
      const [g, p, e] = await Promise.all([
        sb.from('galleries').select('status'),
        sb.from('photos').select('bytes'),
        sb.from('gallery_events').select('type, photo_count'),
      ]);
      const galleries = check(g) ?? [], photos = check(p) ?? [], events = check(e) ?? [];
      const sum = (t: string) => events.filter((x: Row) => x.type === t).reduce((s: number, x: Row) => s + (t === 'view' ? 1 : x.photo_count), 0);
      return {
        galleries: galleries.length, published: galleries.filter((x: Row) => x.status === 'published').length,
        photos: photos.length, bytes: photos.reduce((s: number, x: Row) => s + Number(x.bytes), 0), views: sum('view'), downloads: sum('download'),
      };
    },
    async listGalleries() {
      // shortcut: aggregates are counted in the browser; move them to a SQL view if a studio passes a few thousand galleries.
      const [g, p, e, f, s] = await Promise.all([
        sb.from('galleries').select('*').order('created_at', { ascending: false }),
        sb.from('photos').select('gallery_id'),
        sb.from('gallery_events').select('gallery_id, type, photo_count'),
        sb.from('favorites').select('gallery_id, photo_id'),
        sb.from('selections').select('gallery_id, status'),
      ]);
      const photos = check(p) ?? [], events = check(e) ?? [], favs = check(f) ?? [], sels = check(s) ?? [];
      return (check(g) ?? []).map((r: Row): GallerySummary => ({
        ...toGallery(r),
        photoCount: photos.filter((x: Row) => x.gallery_id === r.id).length,
        views: events.filter((x: Row) => x.gallery_id === r.id && x.type === 'view').length,
        downloads: events.filter((x: Row) => x.gallery_id === r.id && x.type === 'download').reduce((n: number, x: Row) => n + x.photo_count, 0),
        favorites: new Set(favs.filter((x: Row) => x.gallery_id === r.id).map((x: Row) => x.photo_id)).size,
        selectionsSubmitted: sels.filter((x: Row) => x.gallery_id === r.id && x.status === 'submitted').length,
      }));
    },
    async getGallery(id) {
      const r = check(await sb.from('galleries').select('*').eq('id', id).maybeSingle());
      return r ? toGallery(r) : null;
    },
    async createGallery(input) {
      const r = check(await sb.from('galleries').insert({
        slug: gallerySlug(input.clientName), title: input.title.trim(), client_name: input.clientName.trim(),
        description: input.description.trim(), event_date: input.eventDate,
      }).select('*').single());
      return toGallery(r);
    },
    async updateGallery(g) {
      check(await sb.from('galleries').update({
        title: g.title, client_name: g.clientName, description: g.description, event_date: g.eventDate, cover_photo_id: g.coverPhotoId,
        status: g.status, expires_at: g.settings.expiresAt, allow_download: g.settings.allowDownload, allow_favorites: g.settings.allowFavorites,
        allow_selection: g.settings.allowSelection, selection_limit: g.settings.selectionLimit, presentation: g.settings.presentation,
        slide_seconds: g.settings.slideSeconds, music: g.settings.music,
      }).eq('id', g.id));
    },
    async setPassword(galleryId, password) {
      check(await sb.rpc('set_gallery_password', { p_gallery: galleryId, p_password: password }));
    },
    async deleteGallery(id) {
      const rows = check(await sb.from('photos').select('storage_prefix, original_ext').eq('gallery_id', id)) ?? [];
      const g = check(await sb.from('galleries').select('music_path').eq('id', id).single());
      // Files first: if storage refuses, the gallery row stays and the photographer can retry. No orphaned rows pointing at nothing.
      await removeObjects([...rows.flatMap((r: Row) => Object.values(photoPaths(r))), ...(g?.music_path ? [g.music_path] : [])]);
      check(await sb.from('galleries').delete().eq('id', id));
    },
    async uploadMusic(galleryId, file) {
      const old = check(await sb.from('galleries').select('music_path').eq('id', galleryId).single());
      const path = `${await uid()}/${galleryId}/music-${Date.now()}.${file.name.split('.').pop()?.toLowerCase() || 'mp3'}`;
      check(await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type }));
      check(await sb.from('galleries').update({ music_path: path, music: 'custom' }).eq('id', galleryId));
      if (old?.music_path) await removeObjects([old.music_path]);
    },

    async listPhotos(galleryId) {
      return (check(await sb.from('photos').select('*').eq('gallery_id', galleryId).order('position')) ?? []).map(toPhoto);
    },
    async uploadPhoto(galleryId, file, processed, onProgress) {
      const owner = await uid();
      const { data: session } = await sb.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('Sessão expirada. Entre novamente.');
      const id = crypto.randomUUID();
      const prefix = `${owner}/${galleryId}/${id}`;
      const ext = EXT[file.type] ?? 'jpg';
      const total = file.size + processed.display.size + processed.thumb.size;
      const uploaded: string[] = [];
      try {
        await xhrUpload(`${prefix}/original.${ext}`, file, token, (f) => onProgress((f * file.size) / total));
        uploaded.push(`${prefix}/original.${ext}`);
        await xhrUpload(`${prefix}/display.webp`, processed.display, token, (f) => onProgress((file.size + f * processed.display.size) / total));
        uploaded.push(`${prefix}/display.webp`);
        await xhrUpload(`${prefix}/thumb.webp`, processed.thumb, token, () => {});
        uploaded.push(`${prefix}/thumb.webp`);
        const { count } = await sb.from('photos').select('id', { count: 'exact', head: true }).eq('gallery_id', galleryId);
        const r = check(await sb.from('photos').insert({
          id, gallery_id: galleryId, name: file.name.slice(0, 200), width: processed.width, height: processed.height, bytes: file.size,
          position: count ?? 0, blur: processed.blur, storage_prefix: prefix, original_ext: ext,
        }).select('*').single());
        await sb.from('galleries').update({ cover_photo_id: id }).eq('id', galleryId).is('cover_photo_id', null);
        onProgress(1);
        return toPhoto(r);
      } catch (e) {
        if (uploaded.length) await sb.storage.from(BUCKET).remove(uploaded); // don't leave orphaned files behind a failed upload
        throw e;
      }
    },
    async deletePhotos(galleryId, ids) {
      const rows = check(await sb.from('photos').select('id, storage_prefix, original_ext').eq('gallery_id', galleryId).in('id', ids)) ?? [];
      await removeObjects(rows.flatMap((r: Row) => Object.values(photoPaths(r))));
      check(await sb.from('photos').delete().eq('gallery_id', galleryId).in('id', ids));
      const rest = (check(await sb.from('photos').select('id').eq('gallery_id', galleryId).order('position')) ?? []).map((r: Row) => r.id);
      await this.reorderPhotos(galleryId, rest);
      await sb.from('galleries').update({ cover_photo_id: rest[0] ?? null }).eq('id', galleryId).is('cover_photo_id', null);
    },
    async reorderPhotos(galleryId, orderedIds) {
      // shortcut: one UPDATE per photo, batched 20 at a time; replace with an RPC taking the id array if galleries reach thousands of photos.
      for (let i = 0; i < orderedIds.length; i += 20) {
        const batch = orderedIds.slice(i, i + 20).map((id, k) => sb.from('photos').update({ position: i + k }).eq('id', id).eq('gallery_id', galleryId));
        for (const res of await Promise.all(batch)) check(res);
      }
    },
    async movePhotos(galleryId, ids, albumId) {
      check(await sb.from('photos').update({ album_id: albumId }).eq('gallery_id', galleryId).in('id', ids));
    },
    async photoUrls(photos, size) {
      if (!photos.length) return {};
      const rows = check(await sb.from('photos').select('id, storage_prefix, original_ext').in('id', photos.map((p) => p.id))) ?? [];
      const urls = await sign(rows.map((r: Row) => photoPaths(r)[size]));
      return Object.fromEntries(rows.map((r: Row, i: number) => [r.id, urls[i] ?? '']));
    },

    async listAlbums(galleryId) {
      return (check(await sb.from('albums').select('*').eq('gallery_id', galleryId).order('position')) ?? []).map(toAlbum);
    },
    async createAlbum(galleryId, name) {
      const { count } = await sb.from('albums').select('id', { count: 'exact', head: true }).eq('gallery_id', galleryId);
      return toAlbum(check(await sb.from('albums').insert({ gallery_id: galleryId, name: name.trim(), position: count ?? 0 }).select('*').single()) as Row);
    },
    async renameAlbum(albumId, name) {
      check(await sb.from('albums').update({ name: name.trim() }).eq('id', albumId));
    },
    async deleteAlbum(albumId) {
      check(await sb.from('albums').delete().eq('id', albumId));
    },

    async listFavorites(galleryId) {
      const rows = check(await sb.from('favorites').select('visitor_id, photo_id, created_at').eq('gallery_id', galleryId).order('created_at')) ?? [];
      const byVisitor = new Map<string, VisitorFavorites>();
      for (const r of rows as Row[]) {
        const v: VisitorFavorites = byVisitor.get(r.visitor_id) ?? { visitorId: r.visitor_id, label: `Visitante ${byVisitor.size + 1}`, photoIds: [], updatedAt: r.created_at };
        v.photoIds.push(r.photo_id);
        v.updatedAt = r.created_at;
        byVisitor.set(r.visitor_id, v);
      }
      return [...byVisitor.values()];
    },
    async listSelections(galleryId) {
      return (check(await sb.from('selections').select('*').eq('gallery_id', galleryId).order('updated_at', { ascending: false })) ?? []).map(toSelection);
    },
    async reopenSelection(selectionId) {
      check(await sb.from('selections').update({ status: 'open', submitted_at: null, updated_at: new Date().toISOString() }).eq('id', selectionId));
    },
  };
}
