'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';
import { ChevronLeft, ChevronRight, CircleCheck, Download, Heart, Info, LoaderCircle, X, ZoomIn, ZoomOut } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import type { PublicPhoto } from '@/types';
import type { GridFlags } from './PhotoGrid';

const ZOOM = 2.4;
const SPRING = { type: 'spring', bounce: 0, duration: 0.38 } as const;
// Apple's momentum projection: where a flick would come to rest.
const project = (v: number, d = 0.998) => ((v / 1000) * d) / (1 - d);

function useViewport() {
  const [vp, setVp] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

/**
 * The viewing room. The print grows out of the wall into the dark (shared layout, only on open and close),
 * pages follow the finger and slide in from the side they were thrown, a pull downward dims the room
 * and lets go back to the wall, and a double tap zooms into the point that was tapped.
 */
export function Lightbox({ photos, index, numberOf, albumOf, flags, canDownload, downloading, onIndex, onClose, onFavorite, onChoose, onDownload }: {
  photos: PublicPhoto[];
  index: number;
  numberOf: (id: string) => number;
  albumOf: (p: PublicPhoto) => string | null;
  flags: GridFlags;
  canDownload: boolean;
  downloading: boolean;
  onIndex: (i: number) => void;
  onClose: () => void;
  onFavorite: (id: string) => void;
  onChoose: (id: string) => void;
  onDownload: (p: PublicPhoto) => void;
}) {
  const photo = photos[index];
  const vp = useViewport();
  const [zoom, setZoom] = useState<{ on: boolean; ox: number; oy: number }>({ on: false, ox: 50, oy: 50 });
  const [info, setInfo] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [dir, setDir] = useState(0);
  // The shared-layout link to the grid only exists on the way in and on the way out, so paging never flies tiles around.
  const [linked, setLinked] = useState<string | null>(photo?.id ?? null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const room = useTransform(y, [-320, 0, 320], [0.25, 1, 0.25]);
  const shrink = useTransform(y, [-400, 0, 400], [0.86, 1, 0.86]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastTap = useRef(0);

  const close = useCallback(() => {
    if (!photo) return onClose();
    setLinked(photo.id);
    requestAnimationFrame(() => onClose());
  }, [onClose, photo]);

  const go = useCallback((d: number) => {
    const next = index + d;
    if (next < 0 || next >= photos.length) {
      animate(x, 0, SPRING);
      return;
    }
    setLinked(null);
    setZoom((z) => ({ ...z, on: false }));
    setDir(d);
    onIndex(next);
  }, [index, photos.length, onIndex, x]);

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => void (document.body.style.overflow = prev);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') close();
      else if (e.key.toLowerCase() === 'f' && flags.allowFavorites && photo) onFavorite(photo.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, close, onFavorite, photo, flags.allowFavorites]);

  // Preload the neighbours so swiping never waits.
  useEffect(() => {
    for (const p of [photos[index + 1], photos[index - 1]]) if (p) new Image().src = p.display;
  }, [index, photos]);

  if (!photo) return null;
  const n = numberOf(photo.id);
  const fav = flags.favorites.has(photo.id);
  const chosen = flags.chosen.has(photo.id);
  const album = albumOf(photo);

  // Fit the print inside the room, leaving the top and bottom bars clear.
  const padY = vp.w < 640 ? 112 : 136;
  const padX = vp.w < 640 ? 0 : 128;
  const scale = Math.min((vp.w - padX) / photo.width, (vp.h - padY) / photo.height);
  const w = Math.max(1, Math.round(photo.width * scale));
  const h = Math.max(1, Math.round(photo.height * scale));
  const travel = vp.w + 40;

  const bar = `transition-opacity duration-300 ${chrome || info ? 'opacity-100' : 'pointer-events-none opacity-0'}`;
  const btn = 'press grid size-11 place-items-center rounded-full text-white/90 hover:bg-white/10 hover:text-white';

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Fotografia ${n} de ${photos.length}`}
      className="dark-room fixed inset-0 z-50 select-none text-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 1 }}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-room"
        style={{ opacity: room }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.25 } }}
        transition={{ duration: 0.3 }}
      />
      <div className="absolute inset-0 grid place-items-center overflow-hidden">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={photo.id}
            layoutId={linked === photo.id ? `photo-${photo.id}` : undefined}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d * travel }),
              center: { x: 0 },
              exit: (d: number) => ({ x: -d * travel }),
            }}
            initial="enter"
            animate="center"
            exit={linked === photo.id ? undefined : 'exit'}
            transition={SPRING}
            style={{ width: w, height: h, scale: shrink }}
            className="relative"
          >
            <motion.div
              className="size-full touch-none"
              style={{ x, y, transformOrigin: `${zoom.ox}% ${zoom.oy}%` }}
              animate={{ scale: zoom.on ? ZOOM : 1 }}
              transition={SPRING}
              drag
              dragDirectionLock={!zoom.on}
              dragConstraints={zoom.on
                ? { left: (-w * (ZOOM - 1)) / 2, right: (w * (ZOOM - 1)) / 2, top: (-h * (ZOOM - 1)) / 2, bottom: (h * (ZOOM - 1)) / 2 }
                : { left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={zoom.on ? 0.15 : { left: index === photos.length - 1 ? 0.2 : 0.7, right: index === 0 ? 0.2 : 0.7, top: 0.6, bottom: 0.9 }}
              dragTransition={{ bounceStiffness: 400, bounceDamping: 40 }}
              onDragEnd={(_, i) => {
                if (zoom.on) return;
                const pastX = i.offset.x + project(i.velocity.x);
                const pastY = i.offset.y + project(i.velocity.y);
                if (Math.abs(i.offset.y) > Math.abs(i.offset.x) && Math.abs(pastY) > 160) {
                  close();
                  return;
                }
                if (pastX < -w * 0.35) go(1);
                else if (pastX > w * 0.35) go(-1);
                animate(x, 0, SPRING);
                animate(y, 0, SPRING);
              }}
              onTap={(e, info) => {
                const now = Date.now();
                if (now - lastTap.current < 280) {
                  const r = (e.currentTarget as HTMLElement | null)?.getBoundingClientRect?.() ?? (e.target as HTMLElement).getBoundingClientRect();
                  setZoom((z) => ({ on: !z.on, ox: ((info.point.x - window.scrollX - r.left) / r.width) * 100, oy: ((info.point.y - window.scrollY - r.top) / r.height) * 100 }));
                  x.set(0);
                  y.set(0);
                  lastTap.current = 0;
                } else {
                  setChrome((c) => !c);
                  lastTap.current = now;
                }
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.display} alt={`Fotografia ${n}`} draggable={false} className="pointer-events-none size-full object-contain" style={{ backgroundImage: photo.blur ? `url(${photo.blur})` : undefined, backgroundSize: 'cover' }} />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={`absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-2 pt-[max(env(safe-area-inset-top),8px)] sm:px-4 ${bar}`}>
        <button ref={closeRef} type="button" onClick={close} aria-label="Fechar e voltar à galeria" className={btn}><X size={22} /></button>
        <p className="tnum text-[14px] text-white/80" aria-live="polite">{n} / {photos.length}</p>
        <div className="flex items-center">
          <button type="button" onClick={() => setZoom((z) => ({ on: !z.on, ox: 50, oy: 50 }))} aria-label={zoom.on ? 'Reduzir' : 'Ampliar'} className={`${btn} max-sm:hidden`}>{zoom.on ? <ZoomOut size={20} /> : <ZoomIn size={20} />}</button>
          <button type="button" onClick={() => setInfo((v) => !v)} aria-pressed={info} aria-label="Informações da foto" className={btn}><Info size={20} /></button>
          {canDownload && (
            <button type="button" onClick={() => onDownload(photo)} disabled={downloading} aria-label="Baixar esta foto" className={btn}>
              {downloading ? <LoaderCircle size={20} className="animate-spin" /> : <Download size={20} />}
            </button>
          )}
        </div>
      </div>

      <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label="Foto anterior" className={`${btn} absolute left-3 top-1/2 -translate-y-1/2 disabled:opacity-0 max-sm:hidden ${bar}`}><ChevronLeft size={26} /></button>
      <button type="button" onClick={() => go(1)} disabled={index === photos.length - 1} aria-label="Próxima foto" className={`${btn} absolute right-3 top-1/2 -translate-y-1/2 disabled:opacity-0 max-sm:hidden ${bar}`}><ChevronRight size={26} /></button>

      <div className={`absolute inset-x-0 bottom-0 px-4 pb-[max(env(safe-area-inset-bottom),12px)] sm:px-6 ${bar}`}>
        {info && (
          <dl className="tnum mx-auto mb-3 grid max-w-md grid-cols-2 gap-x-6 gap-y-1.5 rounded-2xl bg-white/[0.07] px-5 py-4 text-[13px]">
            <dt className="text-white/55">Número</dt><dd className="text-right">{String(n).padStart(2, '0')} de {photos.length}</dd>
            {album && <><dt className="text-white/55">Álbum</dt><dd className="text-right">{album}</dd></>}
            <dt className="text-white/55">Dimensões</dt><dd className="text-right">{photo.width} × {photo.height} px</dd>
            <dt className="text-white/55">Arquivo original</dt><dd className="text-right">{formatBytes(photo.bytes)}</dd>
          </dl>
        )}
        <div className="flex items-center justify-between">
          <p className="tnum min-w-0 truncate text-[13px] text-white/70">
            Nº {String(n).padStart(2, '0')}{album ? ` · ${album}` : ''}
          </p>
          <div className="flex items-center gap-1">
            {flags.allowSelection && (
              <button
                type="button"
                onClick={() => onChoose(photo.id)}
                disabled={flags.selectionLocked}
                aria-pressed={chosen}
                className="press flex h-11 items-center gap-2 rounded-full px-3 text-[14px] text-white/90 hover:bg-white/10 disabled:opacity-60"
              >
                <CircleCheck size={20} strokeWidth={chosen ? 2 : 1.6} className={chosen ? 'fill-[var(--color-accent)]' : ''} />
                {chosen ? 'Escolhida' : 'Escolher'}
              </button>
            )}
            {flags.allowFavorites && (
              <button type="button" onClick={() => onFavorite(photo.id)} aria-pressed={fav} aria-label={fav ? 'Remover das favoritas' : 'Favoritar'} className={btn}>
                <Heart key={String(fav)} size={21} strokeWidth={1.8} className={fav ? 'pop fill-[var(--color-accent)] text-[var(--color-accent)]' : ''} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
