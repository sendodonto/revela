'use client';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, CircleCheck, Heart } from 'lucide-react';
import { justify } from '@/lib/justify';
import type { PublicPhoto } from '@/types';
import { PhotoImg } from './PhotoImg';

export interface GridFlags {
  favorites: Set<string>;
  chosen: Set<string>;
  picked: Set<string> | null;
  allowFavorites: boolean;
  allowSelection: boolean;
  selectionLocked: boolean;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Justified rows: every photograph at its true proportions, hung edge to edge like a salon wall. */
export function PhotoGrid({ photos, numberOf, flags, onOpen, onFavorite, onChoose, onPick }: {
  photos: PublicPhoto[];
  numberOf: (id: string) => number;
  flags: GridFlags;
  onOpen: (id: string) => void;
  onFavorite: (id: string) => void;
  onChoose: (id: string) => void;
  onPick: (id: string) => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const narrow = width < 640;
  const gap = narrow ? 4 : 10;
  const rows = useMemo(() => (width ? justify(photos, width, narrow ? 168 : width > 1400 ? 340 : 290, gap) : []), [photos, width, narrow, gap]);

  return (
    <div ref={ref} className="w-full">
      {!width && <div className="h-[60vh]" />}
      {rows.map((row, r) => (
        <div key={r} className="flex" style={{ gap, marginBottom: gap, height: row.height }}>
          {row.items.map(({ item, width: w }) => (
            <Tile key={item.id} photo={item} width={w} height={row.height} n={numberOf(item.id)} flags={flags} onOpen={onOpen} onFavorite={onFavorite} onChoose={onChoose} onPick={onPick} eager={r < 2} />
          ))}
        </div>
      ))}
    </div>
  );
}

const Tile = memo(function Tile({ photo, width, height, n, flags, onOpen, onFavorite, onChoose, onPick, eager }: {
  photo: PublicPhoto; width: number; height: number; n: number; flags: GridFlags; eager: boolean;
  onOpen: (id: string) => void; onFavorite: (id: string) => void; onChoose: (id: string) => void; onPick: (id: string) => void;
}) {
  const fav = flags.favorites.has(photo.id);
  const chosen = flags.chosen.has(photo.id);
  const picking = !!flags.picked;
  const picked = !!flags.picked?.has(photo.id);
  const label = `Fotografia ${n}`;

  return (
    <div className="group relative shrink-0" style={{ width, height }}>
      <motion.button
        type="button"
        layoutId={`photo-${photo.id}`}
        onClick={() => (picking ? onPick(photo.id) : onOpen(photo.id))}
        aria-label={picking ? `${picked ? 'Desmarcar' : 'Marcar'} ${label}` : `Abrir ${label}`}
        aria-pressed={picking ? picked : undefined}
        className="block size-full cursor-zoom-in focus-visible:outline-offset-[3px]"
        style={{ cursor: picking ? 'pointer' : undefined }}
      >
        <PhotoImg src={photo.thumb} blur={photo.blur} alt={label} eager={eager} className={`size-full transition-[filter,transform] duration-300 ${picking && !picked ? 'brightness-[0.82]' : ''}`} />
      </motion.button>

      {picking ? (
        <span aria-hidden className={`pointer-events-none absolute left-2 top-2 grid size-6 place-items-center rounded-full border-[1.5px] ${picked ? 'border-white bg-ink text-white' : 'border-white/90 bg-black/15'}`}>
          {picked && <Check size={14} strokeWidth={2.5} />}
        </span>
      ) : (
        <>
          <span className="tnum pointer-events-none absolute bottom-2 left-2.5 text-[11px] font-medium text-white opacity-0 drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)] transition-opacity group-hover:opacity-100">
            {String(n).padStart(2, '0')}
          </span>
          {flags.allowSelection && (
            <button
              type="button"
              onClick={() => onChoose(photo.id)}
              disabled={flags.selectionLocked}
              aria-pressed={chosen}
              aria-label={`${chosen ? 'Tirar da seleção' : 'Escolher'}: ${label}`}
              className={`press absolute right-0 top-0 grid size-11 place-items-center text-white drop-shadow-[0_1px_3px_rgb(0_0_0/0.55)] disabled:cursor-default ${chosen ? '' : '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100'}`}
            >
              {chosen ? <CircleCheck size={22} className="fill-[var(--color-accent)] text-white" strokeWidth={2} /> : <CircleCheck size={22} strokeWidth={1.6} />}
            </button>
          )}
          {flags.allowFavorites && (
            <button
              type="button"
              onClick={() => onFavorite(photo.id)}
              aria-pressed={fav}
              aria-label={`${fav ? 'Remover das favoritas' : 'Favoritar'}: ${label}`}
              className={`press absolute bottom-0 right-0 grid size-11 place-items-center text-white drop-shadow-[0_1px_3px_rgb(0_0_0/0.55)] ${fav ? '' : 'opacity-80 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100'}`}
            >
              <Heart key={String(fav)} size={19} strokeWidth={1.8} className={fav ? 'pop fill-[var(--color-accent)] text-[var(--color-accent)]' : ''} />
            </button>
          )}
        </>
      )}
    </div>
  );
});
