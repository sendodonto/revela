'use client';
import { Play } from 'lucide-react';
import { formatDate, plural } from '@/lib/format';
import type { PublicGallery } from '@/types';
import { PhotoImg } from './PhotoImg';
import { StudioMark } from './StudioMark';

/** The show's title wall: the cover print leads, the names and the two ways in sit beside or below it. */
export function Cover({ data, onEnter, onPresent }: { data: PublicGallery; onEnter: () => void; onPresent: () => void }) {
  const { gallery, studio, photos } = data;
  const cover = photos.find((p) => p.id === gallery.coverPhotoId) ?? photos[0];

  return (
    <header className="relative lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,1.5fr)_minmax(380px,1fr)]">
      <div className="relative h-[66svh] min-h-[380px] lg:h-auto lg:min-h-dvh">
        {cover ? (
          <PhotoImg src={cover.display} blur={cover.blur} alt={`Capa: ${gallery.title}, ${gallery.clientName}`} eager sizes="(min-width: 1024px) 60vw, 100vw" className="absolute inset-0" />
        ) : (
          <div className="absolute inset-0 bg-wall-2" />
        )}
        {/* A short scrim only behind the mark, so it reads on any photograph. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(rgb(0_0_0/0.32),transparent)]" />
        <div className="absolute left-5 top-[max(env(safe-area-inset-top),20px)] sm:left-8 lg:left-10">
          <StudioMark studio={studio} tone="light" />
        </div>
      </div>

      <div className="flex flex-col justify-end px-5 pb-10 pt-8 sm:px-8 lg:px-12 lg:pb-14 xl:px-16">
        <h1 className="rise font-display text-[42px] leading-[1.02] sm:text-[60px] xl:text-[84px]" style={{ '--d': 80 } as React.CSSProperties}>
          {gallery.clientName}
        </h1>
        <p className="rise tnum mt-3 text-[14px] text-ink-3 sm:text-[15px]" style={{ '--d': 160 } as React.CSSProperties}>
          {[gallery.title, gallery.eventDate && formatDate(gallery.eventDate), plural(photos.length, 'fotografia', 'fotografias')].filter(Boolean).join('  ·  ')}
        </p>
        <div className="rise mt-6 flex sm:mt-8 flex-wrap items-center gap-x-6 gap-y-3" style={{ '--d': 280 } as React.CSSProperties}>
          <button type="button" onClick={onEnter} className="press h-12 rounded-full bg-ink px-7 text-[15px] font-medium text-wall hover:bg-[#2a2a28]">
            Ver galeria
          </button>
          {gallery.settings.presentation && photos.length > 0 && (
            <button type="button" onClick={onPresent} className="press group flex h-12 items-center gap-2.5 text-[15px] font-medium text-ink">
              <span className="grid size-9 place-items-center rounded-full border border-rule-2 transition-colors group-hover:border-ink">
                <Play size={14} fill="currentColor" aria-hidden />
              </span>
              Assistir à apresentação
            </button>
          )}
        </div>
        {gallery.description && (
          <p className="rise mt-6 max-w-[46ch] text-[15px] leading-relaxed text-ink-2" style={{ '--d': 260 } as React.CSSProperties}>{gallery.description}</p>
        )}
      </div>
    </header>
  );
}
