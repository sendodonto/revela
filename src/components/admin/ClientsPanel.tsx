'use client';
import { useEffect, useState } from 'react';
import { CircleCheck, ClipboardCopy, Heart, LockOpen } from 'lucide-react';
import { PhotoImg } from '@/components/gallery/PhotoImg';
import { Button } from '@/components/ui/Button';
import { confirm } from '@/components/ui/Confirm';
import { Empty } from '@/components/ui/Misc';
import { formatDate, plural, relativeTime } from '@/lib/format';
import { getAdmin } from '@/services';
import { toast, toastError } from '@/store/toast';
import type { Gallery, Photo, Selection, VisitorFavorites } from '@/types';

/** What each client chose: formal selections first (they ask for action), then favorites. */
export function ClientsPanel({ gallery }: { gallery: Gallery }) {
  const admin = getAdmin();
  const [selections, setSelections] = useState<Selection[] | null>(null);
  const [favorites, setFavorites] = useState<VisitorFavorites[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([admin.listSelections(gallery.id), admin.listFavorites(gallery.id), admin.listPhotos(gallery.id)])
      .then(async ([s, f, p]) => {
        setSelections(s);
        setFavorites(f);
        setPhotos(p);
        const wanted = new Set([...s.flatMap((x) => x.photoIds), ...f.flatMap((x) => x.photoIds)]);
        setUrls(await admin.photoUrls(p.filter((x) => wanted.has(x.id)), 'thumb'));
      })
      .catch((e) => toastError(e, 'Não foi possível carregar as escolhas dos clientes.'));
  }, [admin, gallery.id]);

  const number = new Map(photos.map((p, i) => [p.id, i + 1]));
  const byId = new Map(photos.map((p) => [p.id, p]));

  // Numbers and file names in gallery order, ready to paste into Lightroom's filter or a message.
  const copyList = async (ids: string[]) => {
    const sorted = ids.filter((id) => byId.has(id)).sort((a, b) => number.get(a)! - number.get(b)!);
    const text = `Fotos: ${sorted.map((id) => String(number.get(id)).padStart(2, '0')).join(', ')}\nArquivos: ${sorted.map((id) => byId.get(id)!.name).join(', ')}`;
    try {
      await navigator.clipboard.writeText(text);
      toast('Lista copiada: números e nomes dos arquivos.');
    } catch {
      toast('Não foi possível copiar.', 'error');
    }
  };

  const reopen = async (s: Selection) => {
    const ok = await confirm({ title: 'Reabrir a seleção?', message: `${s.clientName} poderá mudar as fotos escolhidas e enviar de novo.`, confirm: 'Reabrir' });
    if (!ok) return;
    try {
      await admin.reopenSelection(s.id);
      setSelections((l) => l?.map((x) => (x.id === s.id ? { ...x, status: 'open', submittedAt: null } : x)) ?? l);
      toast('Seleção reaberta.');
    } catch (e) {
      toastError(e);
    }
  };

  if (selections === null) return <div className="grid gap-3">{[0, 1].map((i) => <div key={i} className="skeleton h-28 rounded" />)}</div>;

  const Strip = ({ ids }: { ids: string[] }) => (
    <ul className="mt-4 grid grid-cols-5 gap-1.5 sm:grid-cols-8 lg:grid-cols-10">
      {ids.filter((id) => byId.has(id)).sort((a, b) => number.get(a)! - number.get(b)!).map((id) => (
        <li key={id} className="relative aspect-square">
          <PhotoImg src={urls[id] ?? ''} blur={byId.get(id)!.blur} alt={`Foto ${number.get(id)}`} className="size-full" />
          <span className="tnum pointer-events-none absolute bottom-1 right-1.5 text-[11px] font-medium text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]">{number.get(id)}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="grid gap-12">
      <section aria-labelledby="sel">
        <h2 id="sel" className="flex items-center gap-2 text-[17px] font-semibold"><CircleCheck size={17} /> Seleções</h2>
        {!gallery.settings.allowSelection && !selections.length ? (
          <p className="mt-2 text-[14px] leading-relaxed text-ink-3">A seleção formal está desligada. Ative em Compartilhamento quando o cliente precisar escolher fotos para álbum ou edição.</p>
        ) : selections.length ? (
          <ul>
            {selections.map((s) => (
              <li key={s.id} className="border-b border-rule py-6 last:border-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[16px] font-medium">{s.clientName || 'Cliente sem nome (ainda escolhendo)'}</p>
                    <p className="tnum mt-0.5 text-[13px] text-ink-3">
                      {plural(s.photoIds.length, 'foto', 'fotos')}{gallery.settings.selectionLimit ? ` de ${gallery.settings.selectionLimit}` : ''} ·{' '}
                      {s.status === 'submitted' ? <span className="text-ok">enviada em {formatDate(s.submittedAt!)}</span> : `em andamento, atualizada ${relativeTime(s.updatedAt)}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" icon={<ClipboardCopy size={14} />} onClick={() => copyList(s.photoIds)} disabled={!s.photoIds.length}>Copiar lista</Button>
                    {s.status === 'submitted' && <Button size="sm" variant="ghost" icon={<LockOpen size={14} />} onClick={() => reopen(s)}>Reabrir</Button>}
                  </div>
                </div>
                {s.note && <blockquote className="mt-3 border-l border-rule-2 pl-3 text-[14px] leading-relaxed text-ink-2">{s.note}</blockquote>}
                <Strip ids={s.photoIds} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[14px] text-ink-3">Nenhum cliente começou a seleção ainda.</p>
        )}
      </section>

      <section aria-labelledby="fav">
        <h2 id="fav" className="flex items-center gap-2 text-[17px] font-semibold"><Heart size={17} /> Favoritas</h2>
        {favorites.length ? (
          <ul>
            {favorites.map((f) => (
              <li key={f.visitorId} className="border-b border-rule py-6 last:border-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[16px] font-medium">{f.label}</p>
                    <p className="tnum mt-0.5 text-[13px] text-ink-3">{plural(f.photoIds.length, 'favorita', 'favoritas')} · {relativeTime(f.updatedAt)}</p>
                  </div>
                  <Button size="sm" variant="secondary" icon={<ClipboardCopy size={14} />} onClick={() => copyList(f.photoIds)}>Copiar lista</Button>
                </div>
                <Strip ids={f.photoIds} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Nenhuma favorita ainda">{gallery.settings.allowFavorites ? 'Cada aparelho que abrir a galeria e favoritar fotos aparece aqui como um visitante.' : 'As favoritas estão desligadas nesta galeria.'}</Empty>
        )}
      </section>
    </div>
  );
}
