'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';
import { PhotoImg } from '@/components/gallery/PhotoImg';
import { StudioMark } from '@/components/gallery/StudioMark';
import { DEMO_GALLERY_PASSWORD, DEMO_LOGIN } from '@/data/seed';
import { DEMO } from '@/lib/config';
import { formatDate, plural } from '@/lib/format';
import { getAdmin, getPublic } from '@/services';
import type { GallerySummary, Studio } from '@/types';

/**
 * The studio's front door. A real installation shows only the brand and contact (galleries are private links).
 * The demo also lists its sample galleries and the panel login, so a photographer can try both sides.
 */
export default function Home() {
  const [studio, setStudio] = useState<Studio | null>(null);
  const [galleries, setGalleries] = useState<(GallerySummary & { coverUrl: string | null; blur: string | null })[]>([]);

  useEffect(() => {
    getPublic().studio().then(setStudio).catch(() => setStudio(null));
    if (!DEMO) return;
    const admin = getAdmin();
    admin.listGalleries().then(async (list) => {
      const published = list.filter((g) => g.status === 'published');
      const withCovers = await Promise.all(published.map(async (g) => {
        const photos = await admin.listPhotos(g.id);
        const cover = photos.find((p) => p.id === g.coverPhotoId) ?? photos[0];
        const url = cover ? (await admin.photoUrls([cover], 'thumb'))[cover.id] : null;
        return { ...g, coverUrl: url ?? null, blur: cover?.blur ?? null };
      }));
      setGalleries(withCovers);
    });
  }, []);

  return (
    <div className="min-h-dvh bg-wall lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(420px,1fr)]" style={{ '--accent': studio?.accent } as React.CSSProperties}>
      <div className="relative h-[52svh] lg:sticky lg:top-0 lg:h-dvh">
        {studio?.cover ? <PhotoImg src={studio.cover} blur={null} alt="" eager className="absolute inset-0" /> : <div className="skeleton absolute inset-0" />}
      </div>

      <main className="px-5 pb-16 pt-10 sm:px-10 lg:px-14 lg:pt-16">
        {studio ? (
          <>
            {studio.logo && <StudioMark studio={studio} className="mb-6" />}
            <h1 className="font-display text-[44px] leading-[1.02] sm:text-[60px]">{studio.name}</h1>
            {studio.city && <p className="mt-3 text-[15px] text-ink-3">{studio.city}</p>}
            <p className="mt-6 text-[15px] leading-relaxed text-ink-2">
              {[studio.email, studio.instagram, studio.phone, studio.website].filter(Boolean).join('  ·  ')}
            </p>
          </>
        ) : (
          <div aria-busy="true">
            <div className="skeleton h-4 w-40 rounded" />
            <div className="skeleton mt-6 h-12 w-72 rounded" />
          </div>
        )}

        {DEMO && (
          <section aria-labelledby="demo" className="mt-14 border-t border-rule pt-8">
            <h2 id="demo" className="text-[17px] font-semibold">Galerias de demonstração</h2>
            <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-ink-3">
              Assim o cliente recebe as fotos: abra uma galeria como se tivesse recebido o link pelo WhatsApp. Estúdio e clientes são fictícios; as fotos são do Pexels.
            </p>
            <ul className="mt-6">
              {galleries.map((g) => (
                <li key={g.id} className="border-b border-rule last:border-0">
                  <Link href={`/g/${g.slug}`} className="group flex items-center gap-4 py-4">
                    <PhotoImg src={g.coverUrl ?? ''} blur={g.blur} alt="" className="size-[72px] shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-medium">{g.clientName}</span>
                      <span className="tnum block text-[13px] text-ink-3">
                        {[g.title, g.eventDate && formatDate(g.eventDate), plural(g.photoCount, 'foto', 'fotos')].filter(Boolean).join(' · ')}
                      </span>
                      {g.settings.hasPassword && (
                        <span className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-2">
                          <LockKeyhole size={12} aria-hidden /> Senha: <code className="font-sans font-medium">{DEMO_GALLERY_PASSWORD}</code>
                        </span>
                      )}
                    </span>
                    <ArrowUpRight size={18} className="text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-10 bg-paper px-5 py-5 ring-1 ring-rule">
              <h3 className="text-[15px] font-semibold">Painel do fotógrafo</h3>
              <p className="tnum mt-1.5 text-[14px] leading-relaxed text-ink-3">
                E-mail <code className="font-sans text-ink">{DEMO_LOGIN.email}</code> · senha <code className="font-sans text-ink">{DEMO_LOGIN.password}</code>
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-3">Na demonstração, o que você enviar fica guardado só neste navegador.</p>
              <Link href="/admin" className="press mt-4 inline-flex h-11 items-center rounded-full bg-ink px-5 text-[14px] font-medium text-wall hover:bg-[#2a2a28]">Entrar no painel</Link>
            </div>
          </section>
        )}

        {!DEMO && (
          <Link href="/admin" className="mt-14 inline-block text-[14px] text-ink-3 underline">Área do fotógrafo</Link>
        )}
      </main>
    </div>
  );
}
