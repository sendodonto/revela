import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { accessState, cleanSelection, downloadName } from '@/lib/rules';
import { adminClient } from '@/lib/server/admin-client';
import { cookieName, unlockToken, validToken } from '@/lib/server/unlock-cookie';
import { photoPaths, toAlbum, toGallery, toPhoto, toSelection, toStudio } from '@/services/supabase-repository';
import type { OpenResult, PublicPhoto } from '@/types';

// The only door to a gallery for anonymous clients. It uses the service role, so it re-applies every rule:
// published, not expired, unlocked (signed cookie bound to the current password), and the per-gallery permissions.

const BUCKET = 'galleries';
const URL_TTL = 60 * 60 * 3;
const VISITOR = /^[A-Za-z0-9-]{8,64}$/;
const UUID = /^[0-9a-f-]{36}$/i;

type Body = { action?: string; visitorId?: string; password?: string; photoIds?: unknown; photoId?: string; on?: boolean; clientName?: string; note?: string; type?: string; count?: number };

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail('Requisição inválida.');
  }
  const db = adminClient();
  const { data: row } = await db.from('galleries').select('*').eq('slug', slug).maybeSingle();
  if (!row) return NextResponse.json({ status: 'not-found' } satisfies OpenResult);
  const gallery = toGallery(row);
  const studioRow = (await db.from('studios').select('*').eq('owner', row.owner).maybeSingle()).data;
  const studio = toStudio(studioRow);
  const sign = async (paths: string[]) => {
    if (!paths.length) return [] as string[];
    const { data, error } = await db.storage.from(BUCKET).createSignedUrls(paths, URL_TTL);
    if (error) throw new Error(error.message);
    return data.map((d) => d.signedUrl ?? '');
  };
  const publicStudio = async () => {
    const signed = await sign([studio.logo, studio.cover].filter((x): x is string => !!x));
    let k = 0;
    return { ...studio, logo: studio.logo ? signed[k++] : null, cover: studio.cover ? signed[k++] : null };
  };

  // Access gate.
  let state = accessState(gallery);
  const jar = await cookies();
  let setCookie: string | null = null;
  if (state === 'locked') {
    const fp = (await db.rpc('gallery_password_fingerprint', { p_gallery: gallery.id })).data as string | null;
    if (validToken(jar.get(cookieName(gallery.id))?.value, gallery.id, fp)) state = 'ok';
    else if (body.action === 'open' && typeof body.password === 'string' && body.password.length <= 72) {
      const ok = (await db.rpc('check_gallery_password', { p_gallery: gallery.id, p_password: body.password })).data as string | null;
      if (ok) {
        state = 'ok';
        setCookie = unlockToken(gallery.id, ok);
      }
    }
  }
  if (state === 'not-found') return NextResponse.json({ status: 'not-found' } satisfies OpenResult);
  if (state === 'expired') return NextResponse.json({ status: 'expired', title: gallery.title, studio: await publicStudio() } satisfies OpenResult);
  if (state === 'locked') {
    return NextResponse.json({ status: 'locked', title: gallery.title, studio: await publicStudio(), wrongPassword: body.action === 'open' && body.password != null } satisfies OpenResult);
  }

  const visitor = typeof body.visitorId === 'string' && VISITOR.test(body.visitorId) ? body.visitorId : null;
  const photoRows = async () => (await db.from('photos').select('*').eq('gallery_id', gallery.id).order('position')).data ?? [];

  try {
    switch (body.action) {
      case 'open': {
        const rows = await photoRows();
        const [thumbs, displays] = await Promise.all([sign(rows.map((r) => photoPaths(r).thumb)), sign(rows.map((r) => photoPaths(r).display))]);
        const photos: PublicPhoto[] = rows.map((r, i) => ({ ...toPhoto(r), thumb: thumbs[i], display: displays[i] }));
        const albums = ((await db.from('albums').select('*').eq('gallery_id', gallery.id).order('position')).data ?? []).map(toAlbum);
        const musicUrl = gallery.settings.music === 'custom' && row.music_path ? (await sign([row.music_path]))[0] : gallery.settings.music === 'ambiente' ? '/demo/music/ambiente.mp3' : null;
        const { status: _s, ...pub } = gallery;
        const res = NextResponse.json({ status: 'ok', data: { gallery: pub, studio: await publicStudio(), albums, photos, musicUrl } } satisfies OpenResult);
        if (setCookie) res.cookies.set(cookieName(gallery.id), setCookie, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
        return res;
      }
      case 'originals': {
        if (!gallery.settings.allowDownload) return fail('O fotógrafo não liberou downloads nesta galeria.', 403);
        let rows = await photoRows();
        if (body.photoIds !== 'all') {
          const wanted = new Set(Array.isArray(body.photoIds) ? body.photoIds.filter((x): x is string => typeof x === 'string').slice(0, 5000) : []);
          rows = rows.filter((r) => wanted.has(r.id));
        }
        const urls = await sign(rows.map((r) => photoPaths(r).original));
        return NextResponse.json(rows.map((r, i) => ({ id: r.id, name: downloadName(gallery.slug, r.position, `x.${r.original_ext}`), url: urls[i] })));
      }
      case 'favorites:get': {
        if (!visitor) return NextResponse.json([]);
        const { data } = await db.from('favorites').select('photo_id').eq('gallery_id', gallery.id).eq('visitor_id', visitor);
        return NextResponse.json((data ?? []).map((r) => r.photo_id));
      }
      case 'favorite:set': {
        if (!gallery.settings.allowFavorites) return fail('Favoritas estão desativadas nesta galeria.', 403);
        if (!visitor || typeof body.photoId !== 'string' || !UUID.test(body.photoId)) return fail('Requisição inválida.');
        const { data: photo } = await db.from('photos').select('id').eq('id', body.photoId).eq('gallery_id', gallery.id).maybeSingle();
        if (!photo) return fail('Foto não encontrada.', 404);
        const q = body.on
          ? db.from('favorites').upsert({ gallery_id: gallery.id, photo_id: photo.id, visitor_id: visitor })
          : db.from('favorites').delete().eq('photo_id', photo.id).eq('visitor_id', visitor);
        const { error } = await q;
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }
      case 'selection:get': {
        if (!visitor) return NextResponse.json(null);
        const { data } = await db.from('selections').select('*').eq('gallery_id', gallery.id).eq('visitor_id', visitor).maybeSingle();
        return NextResponse.json(data ? toSelection(data) : null);
      }
      case 'selection:save': {
        if (!gallery.settings.allowSelection) return fail('A seleção não está ativa nesta galeria.', 403);
        if (!visitor || !Array.isArray(body.photoIds)) return fail('Requisição inválida.');
        const { data: current } = await db.from('selections').select('status').eq('gallery_id', gallery.id).eq('visitor_id', visitor).maybeSingle();
        if (current?.status === 'submitted') return fail('Sua seleção já foi enviada. Peça ao fotógrafo para reabrir.', 409);
        const valid = new Set((await photoRows()).map((r) => r.id as string));
        const clean = cleanSelection(body.photoIds.filter((x): x is string => typeof x === 'string'), valid, gallery.settings.selectionLimit);
        const { data, error } = await db.from('selections')
          .upsert({ gallery_id: gallery.id, visitor_id: visitor, photo_ids: clean, updated_at: new Date().toISOString() }, { onConflict: 'gallery_id,visitor_id' })
          .select('*').single();
        if (error) throw new Error(error.message);
        return NextResponse.json(toSelection(data));
      }
      case 'selection:submit': {
        if (!gallery.settings.allowSelection) return fail('A seleção não está ativa nesta galeria.', 403);
        const name = typeof body.clientName === 'string' ? body.clientName.trim().slice(0, 80) : '';
        if (!visitor) return fail('Requisição inválida.');
        if (!name) return fail('Informe seu nome para o fotógrafo saber de quem é a seleção.');
        const { data: current } = await db.from('selections').select('*').eq('gallery_id', gallery.id).eq('visitor_id', visitor).maybeSingle();
        if (!current?.photo_ids?.length) return fail('Escolha pelo menos uma fotografia antes de enviar.');
        const now = new Date().toISOString();
        const { data, error } = await db.from('selections')
          .update({ client_name: name, note: typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : '', status: 'submitted', submitted_at: now, updated_at: now })
          .eq('id', current.id).select('*').single();
        if (error) throw new Error(error.message);
        return NextResponse.json(toSelection(data));
      }
      case 'event': {
        if (body.type !== 'view' && body.type !== 'download') return fail('Requisição inválida.');
        const count = Math.min(10000, Math.max(1, Math.floor(Number(body.count) || 1)));
        await db.from('gallery_events').insert({ gallery_id: gallery.id, type: body.type, photo_count: count });
        return NextResponse.json({ ok: true });
      }
      default:
        return fail('Ação desconhecida.');
    }
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Erro inesperado.', 500);
  }
}
