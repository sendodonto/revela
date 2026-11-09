'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { AdminPage } from '@/components/admin/AdminShell';
import { GalleryRow, useCovers } from '@/components/admin/GalleryRow';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { Empty } from '@/components/ui/Misc';
import { Sheet } from '@/components/ui/Sheet';
import { getAdmin } from '@/services';
import { toast, toastError } from '@/store/toast';
import type { GallerySummary } from '@/types';

type Filter = 'all' | 'published' | 'draft';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'published', label: 'Publicadas' },
  { id: 'draft', label: 'Rascunhos' },
];

function GalleriesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [galleries, setGalleries] = useState<GallerySummary[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(params.get('nova') === '1');

  useEffect(() => {
    getAdmin().listGalleries().then(setGalleries).catch((e) => toastError(e, 'Não foi possível carregar as galerias.'));
  }, []);

  const shown = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('pt-BR');
    return (galleries ?? []).filter((g) => (filter === 'all' || g.status === filter) && (!term || `${g.clientName} ${g.title}`.toLocaleLowerCase('pt-BR').includes(term)));
  }, [galleries, filter, q]);
  const covers = useCovers(galleries ?? []);

  return (
    <AdminPage title="Galerias" actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Nova galeria</Button>}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Filtrar" className="flex gap-1">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
              className={`press h-9 rounded-full px-3.5 text-[14px] ${filter === f.id ? 'bg-ink text-wall' : 'text-ink-2 hover:bg-ink/[0.05]'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <label className="relative block sm:w-72">
          <span className="sr-only">Buscar galeria</span>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente ou ensaio" className="h-10 w-full rounded-full border border-rule-2 bg-paper pl-10 pr-4 text-[16px] placeholder sm:text-[14px]:text-ink-3 focus:border-ink focus:outline-none" />
        </label>
      </div>

      {galleries === null ? (
        <div className="mt-6 grid gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded" />)}</div>
      ) : shown.length ? (
        <ul className="mt-4">{shown.map((g) => <GalleryRow key={g.id} g={g} cover={covers[g.id]} />)}</ul>
      ) : galleries.length ? (
        <Empty title="Nenhuma galeria encontrada">Tente outro nome ou mude o filtro.</Empty>
      ) : (
        <Empty title="Nenhuma galeria ainda" action={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Criar a primeira</Button>}>
          Cada galeria é uma entrega: um link privado com as fotos do ensaio ou evento.
        </Empty>
      )}

      <NewGallerySheet open={creating} onClose={() => setCreating(false)} onCreated={(id) => router.push(`/admin/galeria?id=${id}`)} />
    </AdminPage>
  );
}

function NewGallerySheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [clientName, setClientName] = useState('');
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ clientName?: string; title?: string }>({});

  return (
    <Sheet open={open} onClose={onClose} title="Nova galeria">
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const errs = { clientName: clientName.trim() ? undefined : 'Informe o nome do cliente.', title: title.trim() ? undefined : 'Dê um título ao ensaio ou evento.' };
          setErrors(errs);
          if (errs.clientName || errs.title) return;
          setBusy(true);
          try {
            const g = await getAdmin().createGallery({ clientName, title, description, eventDate: eventDate || null });
            toast('Galeria criada. Agora envie as fotos.');
            onCreated(g.id);
          } catch (err) {
            toastError(err);
            setBusy(false);
          }
        }}
      >
        <Input label="Cliente" placeholder="Ana & Pedro" value={clientName} onChange={(e) => setClientName(e.target.value)} error={errors.clientName} maxLength={120} autoFocus />
        <Input label="Ensaio ou evento" placeholder="Casamento" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} maxLength={120} />
        <Input label="Data (opcional)" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        <Textarea label="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} hint="Aparece na abertura da galeria, abaixo do título." />
        <p className="text-[13px] leading-relaxed text-ink-3">A galeria começa como rascunho. O link é gerado agora, com um código difícil de adivinhar, e só funciona depois de publicada.</p>
        <div className="mt-1 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={busy}>Criar galeria</Button>
        </div>
      </form>
    </Sheet>
  );
}

export default function GalleriesPage() {
  return (
    <Suspense>
      <GalleriesInner />
    </Suspense>
  );
}
