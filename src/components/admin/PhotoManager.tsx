'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CircleAlert, GripVertical, ImagePlus, Pencil, Plus, RotateCw, Star, Trash2, X } from 'lucide-react';
import { PhotoImg } from '@/components/gallery/PhotoImg';
import { Button } from '@/components/ui/Button';
import { confirm, promptText } from '@/components/ui/Confirm';
import { Progress, Empty } from '@/components/ui/Misc';
import { LIMITS } from '@/lib/config';
import { formatBytes, plural } from '@/lib/format';
import { getAdmin } from '@/services';
import { toast, toastError } from '@/store/toast';
import type { Album, Gallery, Photo } from '@/types';
import { useUploader } from './useUploader';

type Filter = 'all' | 'none' | string;

export function PhotoManager({ gallery, onGalleryChange }: { gallery: Gallery; onGalleryChange: (g: Gallery) => void }) {
  const admin = getAdmin();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const [ps, as] = await Promise.all([admin.listPhotos(gallery.id), admin.listAlbums(gallery.id)]);
    setPhotos(ps);
    setAlbums(as);
    setUrls(await admin.photoUrls(ps, 'thumb'));
  }, [admin, gallery.id]);

  useEffect(() => {
    reload().catch((e) => toastError(e, 'Não foi possível carregar as fotos.'));
  }, [reload]);

  const onUploaded = useCallback(async (p: Photo) => {
    setPhotos((list) => [...(list ?? []), p]);
    const u = await admin.photoUrls([p], 'thumb');
    setUrls((m) => ({ ...m, ...u }));
    if (!gallery.coverPhotoId) onGalleryChange({ ...gallery, coverPhotoId: p.id });
  }, [admin, gallery, onGalleryChange]);
  const uploader = useUploader(gallery.id, onUploaded);

  const addFiles = (files: FileList | File[] | null) => {
    if (!files?.length) return;
    const err = uploader.add([...files]);
    if (err) toast(err, 'error');
  };

  const shown = useMemo(() => {
    if (!photos) return [];
    if (filter === 'all') return photos;
    if (filter === 'none') return photos.filter((p) => !p.albumId);
    return photos.filter((p) => p.albumId === filter);
  }, [photos, filter]);
  const numberOf = useMemo(() => new Map((photos ?? []).map((p, i) => [p.id, i + 1])), [photos]);

  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  // Reorder: drag a handle (mouse or touch) or use the arrow keys on it. Only the full sequence can be reordered.
  const [dragging, setDragging] = useState<string | null>(null);
  const commitOrder = useRef<ReturnType<typeof setTimeout>>(undefined);
  const persistOrder = (list: Photo[]) => {
    clearTimeout(commitOrder.current);
    commitOrder.current = setTimeout(() => {
      admin.reorderPhotos(gallery.id, list.map((p) => p.id)).catch((e) => {
        toastError(e, 'A nova ordem não foi salva.');
        reload();
      });
    }, 500);
  };
  const move = (id: string, to: number) => {
    setPhotos((list) => {
      if (!list) return list;
      const from = list.findIndex((p) => p.id === id);
      if (from < 0 || to < 0 || to >= list.length || from === to) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((p, i) => ({ ...p, position: i }));
    });
  };
  const onHandleDown = (e: React.PointerEvent, id: string) => {
    if (filter !== 'all') return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(id);
  };
  const onHandleMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const target = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-pid]');
    const tid = target?.dataset.pid;
    if (tid && tid !== dragging && photos) move(dragging, photos.findIndex((p) => p.id === tid));
  };
  const onHandleUp = () => {
    if (!dragging) return;
    setDragging(null);
    setPhotos((list) => {
      if (list) persistOrder(list);
      return list;
    });
  };
  const onHandleKey = (e: React.KeyboardEvent, id: string) => {
    if (filter !== 'all' || !photos) return;
    const i = photos.findIndex((p) => p.id === id);
    const d = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = [...photos];
    const to = i + d;
    if (to < 0 || to >= next.length) return;
    [next[i], next[to]] = [next[to], next[i]];
    setPhotos(next);
    persistOrder(next);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-pid="${id}"] [data-handle]`)?.focus());
  };

  const sel = [...selected];
  const setCover = async () => {
    const next = { ...gallery, coverPhotoId: sel[0] };
    try {
      await admin.updateGallery(next);
      onGalleryChange(next);
      setSelected(new Set());
      toast('Capa definida.');
    } catch (e) {
      toastError(e);
    }
  };
  const moveTo = async (albumId: string | null) => {
    try {
      await admin.movePhotos(gallery.id, sel, albumId);
      setPhotos((list) => list?.map((p) => (selected.has(p.id) ? { ...p, albumId } : p)) ?? list);
      setSelected(new Set());
      toast(albumId ? `Movidas para ${albums.find((a) => a.id === albumId)?.name}.` : 'Removidas do álbum.');
    } catch (e) {
      toastError(e);
    }
  };
  const remove = async () => {
    const ok = await confirm({
      title: `Excluir ${plural(sel.length, 'foto', 'fotos')}?`,
      message: 'Os arquivos originais e as miniaturas serão apagados do armazenamento. Favoritas e seleções dos clientes perdem essas fotos. Não dá para desfazer.',
      confirm: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      await admin.deletePhotos(gallery.id, sel);
      setSelected(new Set());
      await reload();
      const g = await admin.getGallery(gallery.id);
      if (g) onGalleryChange(g);
      toast(`${plural(sel.length, 'foto excluída', 'fotos excluídas')}.`);
    } catch (e) {
      toastError(e);
    }
  };

  const newAlbum = async () => {
    const name = await promptText({ title: 'Novo álbum', label: 'Nome do álbum', confirm: 'Criar álbum' });
    if (!name) return;
    try {
      const a = await admin.createAlbum(gallery.id, name.slice(0, 80));
      setAlbums((l) => [...l, a]);
      setFilter(a.id);
    } catch (e) {
      toastError(e);
    }
  };
  const renameAlbum = async (a: Album) => {
    const name = await promptText({ title: 'Renomear álbum', label: 'Nome do álbum', value: a.name, confirm: 'Salvar' });
    if (!name || name === a.name) return;
    try {
      await admin.renameAlbum(a.id, name.slice(0, 80));
      setAlbums((l) => l.map((x) => (x.id === a.id ? { ...x, name } : x)));
    } catch (e) {
      toastError(e);
    }
  };
  const deleteAlbum = async (a: Album) => {
    const ok = await confirm({ title: `Excluir o álbum “${a.name}”?`, message: 'As fotos continuam na galeria, só deixam de pertencer a este álbum.', confirm: 'Excluir álbum', danger: true });
    if (!ok) return;
    try {
      await admin.deleteAlbum(a.id);
      setAlbums((l) => l.filter((x) => x.id !== a.id));
      setPhotos((list) => list?.map((p) => (p.albumId === a.id ? { ...p, albumId: null } : p)) ?? list);
      setFilter('all');
    } catch (e) {
      toastError(e);
    }
  };

  const active = uploader.items.filter((i) => i.status !== 'done');
  const doneCount = uploader.items.filter((i) => i.status === 'done').length;
  const overall = uploader.items.length ? uploader.items.reduce((s, i) => s + (i.status === 'error' ? 1 : i.progress), 0) / uploader.items.length : 0;
  const activeAlbum = albums.find((a) => a.id === filter);

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <input ref={fileInput} type="file" multiple accept={LIMITS.accepted.join(',')} className="sr-only" tabIndex={-1} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className={`press flex w-full flex-col items-center justify-center gap-2 border border-dashed px-6 py-8 text-center transition-colors ${dragOver ? 'border-ink bg-ink/[0.03]' : 'border-rule-2 hover:border-ink/40'}`}
      >
        <ImagePlus size={24} strokeWidth={1.5} className="text-ink-2" aria-hidden />
        <span className="text-[15px] font-medium">Enviar fotografias</span>
        <span className="text-[13px] text-ink-3">Arraste os arquivos para cá ou toque para escolher. JPEG, PNG ou WebP, até {LIMITS.maxUploadMB} MB cada e {LIMITS.maxFilesPerBatch} por vez.</span>
      </button>

      {uploader.items.length > 0 && (
        <section aria-label="Envio de fotos" className="mt-4 border-b border-rule pb-4" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-[14px]">
            <p className="tnum text-ink-2">
              {uploader.busy ? `Enviando… ${doneCount} de ${uploader.items.length}` : `${plural(doneCount, 'foto enviada', 'fotos enviadas')}${active.length ? ` · ${plural(active.length, 'com erro', 'com erro')}` : ''}`}
            </p>
            {!uploader.busy && <button type="button" onClick={uploader.clearFinished} className="text-[13px] text-ink-3 underline">Limpar lista</button>}
          </div>
          <Progress value={overall} label="Progresso do envio" className="mt-2" />
          {active.length > 0 && (
            <ul className="mt-3 grid gap-1.5">
              {active.slice(0, 50).map((it) => (
                <li key={it.id} className="flex items-center gap-3 text-[13px]">
                  {it.status === 'error' ? <CircleAlert size={15} className="shrink-0 text-danger" aria-hidden /> : <span className="size-[15px] shrink-0 animate-pulse rounded-full bg-rule-2" aria-hidden />}
                  <span className="min-w-0 flex-1 truncate">{it.file.name} <span className="text-ink-3">· {formatBytes(it.file.size)}</span></span>
                  {it.status === 'error' ? (
                    <>
                      <span className="max-w-[45%] truncate text-danger">{it.error}</span>
                      {it.error && !/Formato|HEIC|Maior/.test(it.error) && (
                        <button type="button" onClick={() => uploader.retry(it.id)} className="flex items-center gap-1 text-ink underline"><RotateCw size={12} /> Tentar de novo</button>
                      )}
                    </>
                  ) : (
                    <span className="tnum w-24 text-right text-ink-3">{it.status === 'waiting' ? 'Na fila' : it.status === 'processing' ? 'Preparando' : `${Math.round(it.progress * 100)}%`}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="mt-6 flex items-center gap-1 overflow-x-auto no-scrollbar" role="tablist" aria-label="Álbuns">
        {[{ id: 'all', name: 'Todas', n: photos?.length ?? 0 }, ...albums.map((a) => ({ id: a.id, name: a.name, n: photos?.filter((p) => p.albumId === a.id).length ?? 0 })), ...(albums.length ? [{ id: 'none', name: 'Sem álbum', n: photos?.filter((p) => !p.albumId).length ?? 0 }] : [])].map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={filter === t.id} onClick={() => { setFilter(t.id); setSelected(new Set()); }}
            className={`press flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] ${filter === t.id ? 'bg-ink text-wall' : 'text-ink-2 hover:bg-ink/[0.05]'}`}>
            {t.name} <span className={`tnum text-[12px] ${filter === t.id ? 'text-wall/65' : 'text-ink-3'}`}>{t.n}</span>
          </button>
        ))}
        <button type="button" onClick={newAlbum} className="press flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] text-ink-2 hover:bg-ink/[0.05]"><Plus size={15} /> Álbum</button>
      </div>
      {activeAlbum && (
        <div className="mt-2 flex gap-3 text-[13px]">
          <button type="button" onClick={() => renameAlbum(activeAlbum)} className="flex items-center gap-1 text-ink-2 hover:text-ink"><Pencil size={13} /> Renomear</button>
          <button type="button" onClick={() => deleteAlbum(activeAlbum)} className="flex items-center gap-1 text-danger"><Trash2 size={13} /> Excluir álbum</button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="material sticky top-14 z-20 -mx-4 mt-4 flex flex-wrap items-center gap-2 border-y border-rule px-4 py-2.5 sm:mx-0 sm:rounded-full sm:border sm:px-3 lg:top-3">
          <button type="button" onClick={() => setSelected(new Set())} aria-label="Limpar seleção" className="press grid size-9 place-items-center rounded-full hover:bg-ink/[0.06]"><X size={17} /></button>
          <span className="tnum mr-auto text-[14px]">{plural(selected.size, 'selecionada', 'selecionadas')}</span>
          {selected.size === 1 && <Button size="sm" variant="ghost" icon={<Star size={15} />} onClick={setCover}>Usar como capa</Button>}
          {albums.length > 0 && (
            <label className="flex items-center">
              <span className="sr-only">Mover para álbum</span>
              <select
                value=""
                onChange={(e) => e.target.value && moveTo(e.target.value === '__none' ? null : e.target.value)}
                className="h-9 rounded-full border border-rule-2 bg-paper px-3 text-[16px] sm:text-[13px] focus:border-ink focus:outline-none"
              >
                <option value="">Mover para álbum…</option>
                {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                <option value="__none">Sem álbum</option>
              </select>
            </label>
          )}
          <Button size="sm" variant="ghost" className="text-danger" icon={<Trash2 size={15} />} onClick={remove}>Excluir</Button>
        </div>
      )}

      {photos === null ? (
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">{Array.from({ length: 12 }, (_, i) => <div key={i} className="skeleton aspect-square" />)}</div>
      ) : shown.length ? (
        <>
          {filter === 'all' && photos.length > 1 && <p className="mt-4 text-[13px] text-ink-3">Arraste pela alça para mudar a ordem em que o cliente vê as fotos.</p>}
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6" onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp}>
            {shown.map((p) => {
              const isSel = selected.has(p.id);
              const n = numberOf.get(p.id)!;
              return (
                <li key={p.id} data-pid={p.id} className={`group relative aspect-square transition-opacity ${dragging === p.id ? 'opacity-40' : ''}`}>
                  <button type="button" onClick={() => toggle(p.id)} aria-pressed={isSel} aria-label={`${isSel ? 'Desmarcar' : 'Selecionar'} foto ${n}`} className="block size-full">
                    <PhotoImg src={urls[p.id] ?? ''} blur={p.blur} alt="" className={`size-full transition-transform duration-200 ${isSel ? 'scale-[0.9]' : ''}`} />
                  </button>
                  <span aria-hidden className={`pointer-events-none absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-full border-[1.5px] transition-opacity ${isSel ? 'border-ink bg-ink text-white' : 'border-white bg-black/20 opacity-0 group-hover:opacity-100'}`}>
                    {isSel && <Check size={12} strokeWidth={3} />}
                  </span>
                  {gallery.coverPhotoId === p.id && <span className="pointer-events-none absolute bottom-1.5 left-1.5 bg-ink px-1.5 py-0.5 text-[11px] font-medium text-white">Capa</span>}
                  <span className="tnum pointer-events-none absolute bottom-1.5 right-1.5 text-[11px] font-medium text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]">{n}</span>
                  {filter === 'all' && (
                    <button
                      type="button"
                      data-handle
                      aria-label={`Mover foto ${n}. Use as setas para mudar a posição.`}
                      onPointerDown={(e) => onHandleDown(e, p.id)}
                      onKeyDown={(e) => onHandleKey(e, p.id)}
                      className="absolute right-0 top-0 grid size-9 cursor-grab touch-none place-items-center text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)] active:cursor-grabbing [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <GripVertical size={17} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <Empty title={filter === 'all' ? 'Nenhuma foto ainda' : 'Este álbum está vazio'}>
          {filter === 'all' ? 'Envie as fotografias do ensaio. As miniaturas são geradas automaticamente.' : 'Selecione fotos em “Todas” e use “Mover para álbum”.'}
        </Empty>
      )}
    </div>
  );
}
