'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClientGallery } from '@/components/gallery/ClientGallery';
import { BASE } from '@/lib/config';

/** Static hosts serve this page for unknown paths; a /g/<slug> path is a gallery created after the build. */
export default function NotFound() {
  const [slug, setSlug] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const path = window.location.pathname.slice(BASE.length);
    setSlug(path.match(/^\/g\/([a-z0-9-]{8,80})\/?$/)?.[1] ?? null);
  }, []);
  if (slug === undefined) return null;
  if (slug) return <ClientGallery slug={slug} />;
  return (
    <main className="grid min-h-dvh place-items-center bg-wall px-6 text-center">
      <div>
        <h1 className="font-display text-[40px]">Página não encontrada</h1>
        <p className="mt-3 text-[15px] text-ink-3">Confira o endereço ou volte ao início.</p>
        <Link href="/" className="mt-6 inline-block text-[15px] font-medium underline">Voltar ao início</Link>
      </div>
    </main>
  );
}
