'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, Download, Heart, LockKeyhole } from 'lucide-react';
import { PhotoImg } from '@/components/gallery/PhotoImg';
import { formatDate, formatNumber, plural, relativeTime } from '@/lib/format';
import { getAdmin } from '@/services';
import type { GallerySummary } from '@/types';

export type Cover = { url: string; blur: string | null };

/** Cover thumbnails for a list of galleries (signed URLs in Supabase, blob/asset URLs in the demo). */
export function useCovers(galleries: GallerySummary[]) {
  const [covers, setCovers] = useState<Record<string, Cover>>({});
  useEffect(() => {
    let alive = true;
    const admin = getAdmin();
    Promise.all(galleries.map(async (g) => {
      const photos = await admin.listPhotos(g.id);
      const cover = photos.find((p) => p.id === g.coverPhotoId) ?? photos[0];
      if (!cover) return null;
      const url = (await admin.photoUrls([cover], 'thumb'))[cover.id];
      return [g.id, { url, blur: cover.blur }] as const;
    })).then((rows) => alive && setCovers(Object.fromEntries(rows.filter(Boolean) as [string, Cover][])));
    return () => {
      alive = false;
    };
  }, [galleries]);
  return covers;
}

export function StatusPill({ status, expired }: { status: 'draft' | 'published'; expired?: boolean }) {
  const label = expired ? 'Expirada' : status === 'published' ? 'Publicada' : 'Rascunho';
  const tone = expired ? 'text-danger' : status === 'published' ? 'text-ok' : 'text-ink-3';
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${tone}`}>
      <span className={`size-1.5 rounded-full ${expired ? 'bg-danger' : status === 'published' ? 'bg-ok' : 'bg-ink-3/60'}`} aria-hidden />
      {label}
    </span>
  );
}

/** One gallery as a ledger row: cover, who and what, state, and the numbers the photographer checks. */
export function GalleryRow({ g, cover }: { g: GallerySummary; cover?: Cover }) {
  const expired = !!g.settings.expiresAt && new Date(g.settings.expiresAt).getTime() < Date.now();
  return (
    <li className="border-b border-rule last:border-0">
      <Link href={`/admin/galeria?id=${g.id}`} className="group -mx-3 flex items-center gap-4 rounded-xl px-3 py-3.5 transition-colors hover:bg-ink/[0.025]">
        {cover ? <PhotoImg src={cover.url} blur={cover.blur} alt="" className="size-14 shrink-0 sm:size-16" /> : <div className="size-14 shrink-0 bg-wall-2 sm:size-16" />}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-[15px] font-medium">
            {g.clientName}
            {g.settings.hasPassword && <LockKeyhole size={13} className="shrink-0 text-ink-3" aria-label="Protegida por senha" />}
          </p>
          <p className="tnum truncate text-[13px] text-ink-3">
            {[g.title, g.eventDate && formatDate(g.eventDate), plural(g.photoCount, 'foto', 'fotos')].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-1 sm:hidden"><StatusPill status={g.status} expired={expired} /></div>
        </div>
        <div className="hidden w-28 sm:block"><StatusPill status={g.status} expired={expired} /></div>
        <dl className="tnum hidden items-center gap-5 text-[13px] text-ink-2 md:flex">
          <div className="flex w-14 items-center gap-1.5" title="Visualizações"><dt><Eye size={14} className="text-ink-3" aria-label="Visualizações" /></dt><dd>{formatNumber(g.views)}</dd></div>
          <div className="flex w-14 items-center gap-1.5" title="Fotos baixadas"><dt><Download size={14} className="text-ink-3" aria-label="Fotos baixadas" /></dt><dd>{formatNumber(g.downloads)}</dd></div>
          <div className="flex w-12 items-center gap-1.5" title="Fotos favoritadas"><dt><Heart size={14} className="text-ink-3" aria-label="Fotos favoritadas" /></dt><dd>{formatNumber(g.favorites)}</dd></div>
        </dl>
        <p className="hidden w-24 text-right text-[13px] text-ink-3 lg:block">{relativeTime(g.updatedAt)}</p>
      </Link>
    </li>
  );
}
