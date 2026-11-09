import { ClientGallery } from '@/components/gallery/ClientGallery';
import { DEMO } from '@/lib/config';

// Demo: the bundled galleries are prerendered; galleries created in the browser load through not-found.tsx (404 fallback).
export async function generateStaticParams() {
  if (!DEMO) return [];
  const { buildSeed } = await import('@/data/seed');
  return buildSeed().galleries.map((g) => ({ slug: g.slug }));
}

export const metadata = { title: 'Galeria', robots: { index: false, follow: false } };

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ClientGallery slug={slug} />;
}
