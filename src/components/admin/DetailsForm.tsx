'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { confirm } from '@/components/ui/Confirm';
import { Input, Textarea } from '@/components/ui/Field';
import { getAdmin } from '@/services';
import { toast, toastError } from '@/store/toast';
import type { Gallery } from '@/types';

export function DetailsForm({ gallery, onChange }: { gallery: Gallery; onChange: (g: Gallery) => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ clientName: gallery.clientName, title: gallery.title, eventDate: gallery.eventDate ?? '', description: gallery.description });
  const [busy, setBusy] = useState(false);
  const dirty = form.clientName !== gallery.clientName || form.title !== gallery.title || (form.eventDate || null) !== gallery.eventDate || form.description !== gallery.description;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const remove = async () => {
    const ok = await confirm({
      title: `Excluir a galeria de ${gallery.clientName}?`,
      message: 'Todas as fotos (originais e miniaturas), álbuns, favoritas, seleções e estatísticas desta galeria serão apagados. O link deixa de funcionar. Não dá para desfazer.',
      confirm: 'Excluir galeria',
      danger: true,
    });
    if (!ok) return;
    try {
      await getAdmin().deleteGallery(gallery.id);
      toast('Galeria excluída.');
      router.replace('/admin/galerias');
    } catch (e) {
      toastError(e, 'Não foi possível excluir. Nada foi apagado do banco; tente de novo.');
    }
  };

  return (
    <div className="max-w-2xl">
      <form
        className="grid gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!form.clientName.trim() || !form.title.trim()) return toast('Cliente e título são obrigatórios.', 'error');
          setBusy(true);
          const next = { ...gallery, clientName: form.clientName.trim(), title: form.title.trim(), eventDate: form.eventDate || null, description: form.description.trim() };
          try {
            await getAdmin().updateGallery(next);
            onChange(next);
            toast('Informações salvas.');
          } catch (err) {
            toastError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Cliente" value={form.clientName} onChange={set('clientName')} maxLength={120} required />
          <Input label="Ensaio ou evento" value={form.title} onChange={set('title')} maxLength={120} required />
        </div>
        <Input label="Data" type="date" value={form.eventDate} onChange={set('eventDate')} className="sm:max-w-xs" />
        <Textarea label="Descrição" value={form.description} onChange={set('description')} maxLength={2000} hint="Aparece na abertura, abaixo do título. A capa é escolhida na aba Fotos." />
        <div><Button type="submit" loading={busy} disabled={!dirty}>Salvar informações</Button></div>
      </form>

      <section className="mt-14 border-t border-rule pt-6">
        <h2 className="text-[17px] font-semibold">Excluir galeria</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-3">Apaga as fotos do armazenamento e todos os dados da galeria.</p>
        <Button variant="secondary" className="mt-4 text-danger" icon={<Trash2 size={15} />} onClick={remove}>Excluir galeria</Button>
      </section>
    </div>
  );
}
