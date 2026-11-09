'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { CircleCheck, Download, Heart, Lock, Play, X } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Misc';
import { DEMO } from '@/lib/config';
import { fetchBlob, saveBlob, zipFromUrls } from '@/lib/download';
import { formatDate, plural } from '@/lib/format';
import { getPublic } from '@/services';
import { toast, toastError } from '@/store/toast';
import type { OpenResult, PublicGallery, PublicPhoto, Selection } from '@/types';
import { Cover } from './Cover';
import { DownloadSheet, type DownloadJob } from './DownloadSheet';
import { Gate } from './Gate';
import { Lightbox } from './Lightbox';
import { PhotoGrid } from './PhotoGrid';
import { Presentation } from './Presentation';
import { StudioMark } from './StudioMark';
import { SubmitSheet } from './SubmitSheet';

type View = 'all' | 'favorites' | 'selection' | `album:${string}`;

function readPhotoParam() {
  return new URLSearchParams(window.location.search).get('foto');
}
function writePhotoParam(id: string | null, push: boolean) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('foto', id);
  else url.searchParams.delete('foto');
  history[push ? 'pushState' : 'replaceState']({ foto: id }, '', url);
}

export function ClientGallery({ slug }: { slug: string }) {
  const repo = getPublic();
  const [result, setResult] = useState<OpenResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (password?: string) => {
    try {
      setLoadError(null);
      setResult(await repo.open(slug, password));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Não foi possível abrir a galeria.');
    }
  }, [repo, slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError) {
    return (
      <main className="grid min-h-dvh place-items-center bg-wall">
        <Empty title="Não conseguimos abrir a galeria" action={<Button onClick={() => load()}>Tentar de novo</Button>}>{loadError}</Empty>
      </main>
    );
  }
  if (!result) return <GallerySkeleton />;
  if (result.status === 'not-found') return <Gate kind="not-found" />;
  if (result.status === 'expired') return <Gate kind="expired" title={result.title} studio={result.studio} />;
  if (result.status === 'locked') return <Gate kind="locked" title={result.title} studio={result.studio} wrongPassword={result.wrongPassword} onSubmit={(pw) => load(pw)} />;
  return <OpenGallery slug={slug} data={result.data} />;
}

function OpenGallery({ slug, data }: { slug: string; data: PublicGallery }) {
  const repo = getPublic();
  const { gallery, studio, albums, photos } = data;
  const s = gallery.settings;
  const [view, setView] = useState<View>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<Selection | null>(null);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [job, setJob] = useState<DownloadJob | null>(null);
  const [singleBusy, setSingleBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const gridTop = useRef<HTMLDivElement>(null);

  const index = useMemo(() => new Map(photos.map((p, i) => [p.id, i])), [photos]);
  const numberOf = useCallback((id: string) => (index.get(id) ?? 0) + 1, [index]);
  const albumName = useMemo(() => new Map(albums.map((a) => [a.id, a.name])), [albums]);
  const albumOf = useCallback((p: PublicPhoto) => (p.albumId ? albumName.get(p.albumId) ?? null : null), [albumName]);
  const chosen = useMemo(() => new Set(selection?.photoIds ?? []), [selection]);
  const locked = selection?.status === 'submitted';

  const visible = useMemo(() => {
    if (view === 'favorites') return photos.filter((p) => favorites.has(p.id));
    if (view === 'selection') return photos.filter((p) => chosen.has(p.id));
    if (view.startsWith('album:')) return photos.filter((p) => p.albumId === view.slice(6));
    return photos;
  }, [view, photos, favorites, chosen]);

  // Personal state, the view counter, and a deep link straight to a photo.
  useEffect(() => {
    if (s.allowFavorites) repo.getFavorites(slug).then((ids) => setFavorites(new Set(ids))).catch(() => {});
    if (s.allowSelection) repo.getSelection(slug).then(setSelection).catch(() => {});
    try {
      const key = `revela:viewed:${slug}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        repo.logEvent(slug, 'view');
      }
    } catch {}
    const foto = readPhotoParam();
    if (foto && index.has(foto)) setOpenId(foto);
    const onPop = () => setOpenId(readPhotoParam());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [repo, slug, s.allowFavorites, s.allowSelection, index]);

  const open = (id: string) => {
    setOpenId(id);
    writePhotoParam(id, true);
  };
  const close = () => {
    if (history.state?.foto) history.back();
    else {
      writePhotoParam(null, false);
      setOpenId(null);
    }
  };

  const toggleFavorite = useCallback(async (id: string) => {
    const on = !favorites.has(id);
    navigator.vibrate?.(8);
    setFavorites((f) => {
      const n = new Set(f);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
    try {
      await repo.setFavorite(slug, id, on);
    } catch (e) {
      setFavorites((f) => {
        const n = new Set(f);
        if (on) n.delete(id);
        else n.add(id);
        return n;
      });
      toastError(e);
    }
  }, [favorites, repo, slug]);

  // Rapid taps must build on each other, and an older save answering late must not undo a newer one.
  const chosenRef = useRef<string[]>([]);
  const saveSeq = useRef(0);
  useEffect(() => {
    chosenRef.current = selection?.photoIds ?? [];
  }, [selection]);
  const toggleChosen = useCallback(async (id: string) => {
    if (locked) return;
    const before = chosenRef.current;
    const next = before.includes(id) ? before.filter((x) => x !== id) : [...before, id];
    if (s.selectionLimit != null && next.length > s.selectionLimit) {
      toast(`O limite é de ${s.selectionLimit} fotografias. Tire uma para escolher outra.`, 'error');
      return;
    }
    chosenRef.current = next;
    navigator.vibrate?.(8);
    const seq = ++saveSeq.current;
    setSelection((sel) => ({ ...(sel ?? { id: '', galleryId: gallery.id, visitorId: '', clientName: '', note: '', status: 'open', submittedAt: null, updatedAt: '' }), photoIds: next }));
    try {
      const saved = await repo.saveSelection(slug, next);
      if (seq === saveSeq.current) setSelection(saved);
    } catch (e) {
      if (seq === saveSeq.current) {
        chosenRef.current = before;
        setSelection((sel) => (sel ? { ...sel, photoIds: before } : sel));
      }
      toastError(e);
    }
  }, [gallery.id, locked, repo, s.selectionLimit, slug]);

  const togglePick = useCallback((id: string) => {
    setPicked((p) => {
      if (!p) return p;
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const base = slug.replace(/-[a-z2-9]{8}$/, '');
  const runDownload = async (ids: string[] | 'all', label: string) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setDownloadOpen(true);
    setJob({ done: 0, total: ids === 'all' ? photos.length : ids.length, label });
    try {
      const files = await repo.originals(slug, ids);
      if (!files.length) throw new Error('Nenhuma foto para baixar.');
      const blob = files.length === 1
        ? await fetchBlob(files[0].url, ctrl.signal)
        : await zipFromUrls(files, (done, total) => setJob({ done, total, label }), ctrl.signal);
      saveBlob(blob, files.length === 1 ? files[0].name : `${base}${ids === 'all' ? '' : '-selecao'}.zip`);
      repo.logEvent(slug, 'download', files.length);
      toast(files.length === 1 ? 'Foto baixada.' : `${plural(files.length, 'foto', 'fotos')} no arquivo ZIP.`);
      setDownloadOpen(false);
      setPicked(null);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toastError(e, 'O download falhou. Verifique a conexão e tente de novo.');
    } finally {
      setJob(null);
      abort.current = null;
    }
  };

  // One photo: on phones, the share sheet saves it straight to the photo library when the platform supports it.
  const downloadOne = async (p: PublicPhoto) => {
    setSingleBusy(true);
    try {
      const [file] = await repo.originals(slug, [p.id]);
      const blob = await fetchBlob(file.url);
      const asFile = new File([blob], file.name, { type: blob.type || 'image/jpeg' });
      const touch = matchMedia('(pointer: coarse)').matches;
      if (touch && navigator.canShare?.({ files: [asFile] })) {
        await navigator.share({ files: [asFile] }).catch((e) => {
          if (e.name !== 'AbortError') saveBlob(blob, file.name);
        });
      } else saveBlob(blob, file.name);
      repo.logEvent(slug, 'download', 1);
    } catch (e) {
      toastError(e, 'Não foi possível baixar a foto.');
    } finally {
      setSingleBusy(false);
    }
  };

  const enterGrid = () => gridTop.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });

  const tabs: { id: View; label: string; count: number }[] = [
    { id: 'all', label: 'Todas', count: photos.length },
    ...(s.allowFavorites ? [{ id: 'favorites' as View, label: 'Favoritas', count: favorites.size }] : []),
    ...(s.allowSelection ? [{ id: 'selection' as View, label: 'Seleção', count: chosen.size }] : []),
    ...albums.map((a) => ({ id: `album:${a.id}` as View, label: a.name, count: photos.filter((p) => p.albumId === a.id).length })).filter((t) => t.count),
  ];
  const lightboxIndex = openId ? visible.findIndex((p) => p.id === openId) : -1;
  const lightboxList = lightboxIndex >= 0 ? visible : photos;
  const lbIndex = lightboxIndex >= 0 ? lightboxIndex : photos.findIndex((p) => p.id === openId);
  const flags = { favorites, chosen, picked, allowFavorites: s.allowFavorites, allowSelection: s.allowSelection, selectionLocked: locked };
  const showSelectionBar = s.allowSelection && !picked && (chosen.size > 0 || view === 'selection');

  return (
    <div style={{ '--accent': studio.accent } as React.CSSProperties} className="min-h-dvh bg-wall">
      <Cover data={data} onEnter={enterGrid} onPresent={() => setPresenting(true)} />

      <div ref={gridTop} className="scroll-mt-0" />
      <nav aria-label="Galeria" className="material scroll-edge sticky top-0 z-30">
        <div className="mx-auto flex h-14 max-w-[1680px] items-center justify-between gap-3 px-3 sm:px-12">
          <div className="flex min-w-0 items-center gap-3 pl-1">
            <span className="hidden sm:block"><StudioMark studio={studio} /></span>
            <span className="hidden h-4 w-px bg-rule-2 sm:block" aria-hidden />
            <span className="truncate text-[14px] text-ink-2">{gallery.clientName}</span>
          </div>
          <div className="flex items-center gap-1">
            {s.presentation && photos.length > 0 && (
              <>
                <IconButton label="Assistir à apresentação" onClick={() => setPresenting(true)} className="text-ink hover:bg-ink/[0.05] sm:hidden"><Play size={19} /></IconButton>
                <Button variant="ghost" size="sm" icon={<Play size={15} />} onClick={() => setPresenting(true)} className="max-sm:hidden">Apresentação</Button>
              </>
            )}
            {s.allowDownload && photos.length > 0 && (
              <>
                <IconButton label="Baixar fotos" onClick={() => setDownloadOpen(true)} className="text-ink hover:bg-ink/[0.05] sm:hidden"><Download size={19} /></IconButton>
                <Button variant="ghost" size="sm" icon={<Download size={15} />} onClick={() => setDownloadOpen(true)} className="max-sm:hidden">Baixar</Button>
              </>
            )}
          </div>
        </div>
        {tabs.length > 1 && (
          <div className="mx-auto max-w-[1680px] overflow-x-auto px-3 no-scrollbar [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)] sm:px-12 sm:[mask-image:none]" role="tablist" aria-label="Filtrar fotos">
            <div className="flex w-max gap-1 pb-2 pr-8">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={view === t.id}
                  onClick={() => setView(t.id)}
                  className={`press flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[14px] transition-colors sm:h-9 ${view === t.id ? 'bg-ink text-wall' : 'text-ink-2 hover:bg-ink/[0.05]'}`}
                >
                  {t.id === 'favorites' && <Heart size={13} className={view === t.id ? '' : 'text-[var(--color-accent)]'} fill="currentColor" aria-hidden />}
                  {t.label}
                  <span className={`tnum text-[12px] ${view === t.id ? 'text-wall/65' : 'text-ink-3'}`}>
                    {t.id === 'selection' && s.selectionLimit ? `${t.count}/${s.selectionLimit}` : t.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main id="fotos" className="mx-auto max-w-[1680px] px-4 pb-32 pt-4 sm:px-12 sm:pt-10">
        {view === 'selection' && (
          <SelectionIntro selection={selection} limit={s.selectionLimit} studioName={studio.name} />
        )}
        {visible.length ? (
          <PhotoGrid photos={visible} numberOf={numberOf} albumOf={albumOf} flags={flags} onOpen={open} onFavorite={toggleFavorite} onChoose={toggleChosen} onPick={togglePick} />
        ) : view === 'favorites' ? (
          <Empty icon={<Heart size={26} strokeWidth={1.5} />} title="Nenhuma favorita ainda">Toque no coração de uma foto para guardá-la aqui. Suas favoritas ficam salvas neste aparelho.</Empty>
        ) : view === 'selection' ? null : (
          <Empty title="Ainda não há fotos aqui">{studio.name || 'O fotógrafo'} ainda está preparando esta galeria.</Empty>
        )}
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-4 px-5 py-10 text-[14px] text-ink-3 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div>
            <StudioMark studio={studio} />
            <p className="mt-2">{[studio.email, studio.instagram, studio.phone, studio.website].filter(Boolean).join('  ·  ')}</p>
          </div>
          <p className="tnum">
            {gallery.title} · {gallery.clientName}{gallery.eventDate ? ` · ${formatDate(gallery.eventDate)}` : ''}
            {DEMO && <span className="block sm:text-right">Demonstração · fotos de Pexels, uso livre</span>}
          </p>
        </div>
      </footer>

      {picked && (
        <div className="material fixed inset-x-0 bottom-0 z-40 border-t border-rule pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex h-16 max-w-[1680px] items-center justify-between gap-3 px-4 sm:px-6">
            <button type="button" onClick={() => setPicked(null)} className="press flex h-11 items-center gap-2 text-[14px] text-ink-2"><X size={18} /> Cancelar</button>
            <p className="tnum text-[14px] text-ink-2" aria-live="polite">{picked.size ? plural(picked.size, 'selecionada', 'selecionadas') : 'Toque nas fotos'}</p>
            <Button disabled={!picked.size} icon={<Download size={16} />} onClick={() => runDownload([...picked], `Baixando ${plural(picked.size, 'foto', 'fotos')}`)}>Baixar</Button>
          </div>
        </div>
      )}

      {showSelectionBar && (
        <div className="material fixed inset-x-0 bottom-0 z-40 border-t border-rule pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex h-16 max-w-[1680px] items-center justify-between gap-3 px-4 sm:px-6">
            <button type="button" onClick={() => setView('selection')} className="press flex min-w-0 items-center gap-2 text-left text-[14px]">
              {locked ? <Lock size={17} className="shrink-0 text-ink-2" /> : <CircleCheck size={18} className="shrink-0 fill-[var(--color-accent)] text-white" />}
              <span className="tnum truncate text-ink-2">
                {locked ? 'Seleção enviada' : `${chosen.size}${s.selectionLimit ? ` de ${s.selectionLimit}` : ''} ${chosen.size === 1 ? 'escolhida' : 'escolhidas'}`}
              </span>
            </button>
            {!locked && <Button disabled={!chosen.size} onClick={() => setSubmitOpen(true)}>Enviar seleção</Button>}
          </div>
        </div>
      )}

      <AnimatePresence>
        {openId && lbIndex >= 0 && (
          <Lightbox
            key="lightbox"
            photos={lightboxList}
            index={lbIndex}
            numberOf={numberOf}
            albumOf={albumOf}
            flags={flags}
            canDownload={s.allowDownload}
            downloading={singleBusy}
            onIndex={(i) => {
              setOpenId(lightboxList[i].id);
              writePhotoParam(lightboxList[i].id, false);
            }}
            onClose={close}
            onFavorite={toggleFavorite}
            onChoose={toggleChosen}
            onDownload={downloadOne}
          />
        )}
      </AnimatePresence>

      {presenting && (
        <Presentation
          data={data}
          photos={view === 'all' ? photos : visible.length ? visible : photos}
          onClose={() => setPresenting(false)}
          onShowGallery={() => {
            setPresenting(false);
            requestAnimationFrame(enterGrid);
          }}
        />
      )}

      {s.allowDownload && (
        <DownloadSheet
          open={downloadOpen}
          onClose={() => {
            if (job) abort.current?.abort();
            setDownloadOpen(false);
          }}
          total={photos.length}
          totalBytes={photos.reduce((n, p) => n + p.bytes, 0)}
          favorites={favorites.size}
          job={job}
          onAll={() => runDownload('all', 'Baixando a galeria completa')}
          onFavorites={() => runDownload([...favorites], 'Baixando suas favoritas')}
          onPick={() => {
            setDownloadOpen(false);
            setPicked(new Set());
            setView('all');
          }}
          onCancel={() => abort.current?.abort()}
        />
      )}

      {s.allowSelection && (
        <SubmitSheet
          open={submitOpen}
          onClose={() => setSubmitOpen(false)}
          count={chosen.size}
          studioName={studio.name}
          onSubmit={async (name, note) => {
            try {
              setSelection(await repo.submitSelection(slug, name, note));
              toast('Seleção enviada. Obrigado!');
              return true;
            } catch (e) {
              toastError(e);
              return false;
            }
          }}
        />
      )}
    </div>
  );
}

function SelectionIntro({ selection, limit, studioName }: { selection: Selection | null; limit: number | null; studioName: string }) {
  const count = selection?.photoIds.length ?? 0;
  const submitted = selection?.status === 'submitted';
  return (
    <section className="mx-auto max-w-2xl px-4 pb-8 pt-8 text-center sm:pt-6">
      <h2 className="text-[24px] font-semibold tracking-[-0.02em]">{submitted ? 'Seleção enviada' : 'Sua seleção'}</h2>
      <p className="mx-auto mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-3">
        {submitted
          ? `Enviada em ${formatDate(selection!.submittedAt!)} com ${plural(count, 'fotografia', 'fotografias')}. Para mudar algo, peça a ${studioName || 'quem fez as fotos'} para reabrir a seleção.`
          : count
            ? `Estas são as fotos que você escolheu${limit ? `, de até ${limit}` : ''}. Quando estiver tudo certo, envie a seleção.`
            : `Toque no círculo de uma foto para escolhê-la${limit ? `. Você pode escolher até ${limit}` : ''}. Diferente das favoritas, a seleção é enviada para ${studioName || 'o fotógrafo'} como sua escolha final.`}
      </p>
    </section>
  );
}

function GallerySkeleton() {
  return (
    <div className="min-h-dvh bg-wall" aria-busy="true" aria-label="Carregando galeria">
      <div className="skeleton h-[76svh]" />
      <div className="px-5 pt-8">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton mt-4 h-11 w-64 rounded" />
        <div className="skeleton mt-4 h-4 w-44 rounded" />
      </div>
    </div>
  );
}
