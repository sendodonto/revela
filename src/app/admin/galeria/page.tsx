'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { AdminPage } from '@/components/admin/AdminShell';
import { ClientsPanel } from '@/components/admin/ClientsPanel';
import { DetailsForm } from '@/components/admin/DetailsForm';
import { StatusPill } from '@/components/admin/GalleryRow';
import { galleryUrl } from '@/components/admin/links';
import { PhotoManager } from '@/components/admin/PhotoManager';
import { SharePanel } from '@/components/admin/SharePanel';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Misc';
import { formatDate } from '@/lib/format';
import { getAdmin } from '@/services';
import { toast, toastError } from '@/store/toast';
import type { Gallery } from '@/types';

const TABS = [
  { id: 'fotos', label: 'Fotos' },
  { id: 'compartilhar', label: 'Compartilhamento' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'detalhes', label: 'Informações' },
] as const;
type Tab = (typeof TABS)[number]['id'];

function EditorInner() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get('id') ?? '';
  const tab = (TABS.find((t) => t.id === params.get('aba'))?.id ?? 'fotos') as Tab;
  const [gallery, setGallery] = useState<Gallery | null | undefined>(undefined);

  useEffect(() => {
    getAdmin().getGallery(id).then(setGallery).catch((e) => {
      toastError(e);
      setGallery(null);
    });
  }, [id]);

  const setTab = (t: Tab) => router.replace(`/admin/galeria?id=${id}${t === 'fotos' ? '' : `&aba=${t}`}`, { scroll: false });
  const back = <Link href="/admin/galerias" className="mb-5 inline-flex items-center gap-1.5 text-[14px] text-ink-2 hover:text-ink"><ArrowLeft size={15} /> Galerias</Link>;

  if (gallery === undefined) return <AdminPage back={back} title={<span className="skeleton inline-block h-10 w-64 rounded" />}>{null}</AdminPage>;
  if (gallery === null) return <AdminPage back={back} title="Galeria não encontrada"><Empty title="Esta galeria não existe mais">Ela pode ter sido excluída.</Empty></AdminPage>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(galleryUrl(gallery.slug));
      toast(gallery.status === 'published' ? 'Link copiado.' : 'Link copiado. Publique a galeria para ele funcionar.');
    } catch {
      toast('Não foi possível copiar.', 'error');
    }
  };

  return (
    <AdminPage
      display
      back={back}
      title={gallery.clientName}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{[gallery.title, gallery.eventDate && formatDate(gallery.eventDate)].filter(Boolean).join(' · ')}</span>
          <StatusPill status={gallery.status} expired={!!gallery.settings.expiresAt && new Date(gallery.settings.expiresAt) < new Date()} />
        </span>
      }
      actions={
        <>
          <Button variant="secondary" size="sm" icon={<Copy size={14} />} onClick={copy}>Copiar link</Button>
          <a href={galleryUrl(gallery.slug)} target="_blank" rel="noreferrer" className="press inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium hover:bg-ink/[0.05]">
            <ExternalLink size={14} /> Ver como cliente
          </a>
        </>
      }
    >
      <div role="tablist" aria-label="Seções da galeria" className="-mx-4 mb-8 flex gap-6 overflow-x-auto border-b border-rule px-4 no-scrollbar sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`relative h-11 shrink-0 text-[14px] transition-colors ${tab === t.id ? 'font-medium text-ink' : 'text-ink-3 hover:text-ink'}`}>
            {t.label}
            {tab === t.id && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-ink" aria-hidden />}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'fotos' && <PhotoManager gallery={gallery} onGalleryChange={setGallery} />}
        {tab === 'compartilhar' && <SharePanel gallery={gallery} onChange={setGallery} />}
        {tab === 'clientes' && <ClientsPanel gallery={gallery} />}
        {tab === 'detalhes' && <DetailsForm gallery={gallery} onChange={setGallery} />}
      </div>
    </AdminPage>
  );
}

export default function GalleryEditorPage() {
  return (
    <Suspense>
      <EditorInner />
    </Suspense>
  );
}
