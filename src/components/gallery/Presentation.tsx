'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize, Minimize, Music, Pause, Play, RotateCcw, VolumeX, X } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { PublicGallery, PublicPhoto } from '@/types';
import { StudioMark } from './StudioMark';

type Speed = 'lento' | 'normal' | 'rapido';
const SPEED: Record<Speed, { factor: number; label: string }> = {
  lento: { factor: 1.45, label: 'Lento' },
  normal: { factor: 1, label: 'Normal' },
  rapido: { factor: 0.62, label: 'Rápido' },
};
const NEXT_SPEED: Record<Speed, Speed> = { lento: 'normal', normal: 'rapido', rapido: 'lento' };
const INTRO_MS = 3200;

// Ken Burns moves: [scale from, scale to, x from, x to, y from, y to] in % of the frame. Subtle on purpose.
const MOVES: [number, number, number, number, number, number][] = [
  [1.0, 1.09, 0, -1.5, 0, -1],
  [1.1, 1.01, 2, 0, 0, 0.5],
  [1.04, 1.1, -2, 2, 0, 0],
  [1.1, 1.02, 0, 0, 1.5, -1],
  [1.02, 1.1, 1.5, -1, -1, 0.5],
];

type Slide = { key: string; photos: PublicPhoto[] };

/** Pairs consecutive portraits into diptychs on landscape screens, the way a printed book would. */
function buildSlides(photos: PublicPhoto[], landscape: boolean): Slide[] {
  const out: Slide[] = [];
  for (let i = 0; i < photos.length; i++) {
    const a = photos[i];
    const b = photos[i + 1];
    const portrait = (p: PublicPhoto) => p.height / p.width > 1.1;
    if (landscape && b && portrait(a) && portrait(b)) {
      out.push({ key: a.id + b.id, photos: [a, b] });
      i++;
    } else out.push({ key: a.id, photos: [a] });
  }
  return out;
}

export function Presentation({ data, photos, onClose, onShowGallery }: { data: PublicGallery; photos: PublicPhoto[]; onClose: () => void; onShowGallery: () => void }) {
  const { gallery, studio, musicUrl } = data;
  const root = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const progressBar = useRef<HTMLDivElement>(null);
  const anims = useRef(new Set<Animation>());
  const [aspect, setAspect] = useState(16 / 9);
  const [phase, setPhase] = useState<'intro' | 'play' | 'end'>('intro');
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<Speed>('normal');
  const [musicOn, setMusicOn] = useState(!!musicUrl);
  const [fullscreen, setFullscreen] = useState(false);
  const [chrome, setChrome] = useState(true);
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const elapsed = useRef(0);
  const reduced = useMemo(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  const slides = useMemo(() => buildSlides(photos, aspect > 1.15), [photos, aspect]);
  const hold = gallery.settings.slideSeconds * SPEED[speed].factor * 1000;
  const fade = reduced ? 700 : Math.min(1600, hold * 0.3);

  // Viewport shape decides diptychs and cover/contain.
  useEffect(() => {
    const on = () => setAspect(window.innerWidth / window.innerHeight);
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Fullscreen (where the platform allows it; iPhone Safari keeps the fixed full-viewport layer) and screen wake lock.
  useEffect(() => {
    const el = root.current;
    el?.requestFullscreen?.().catch(() => {});
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
      ?.request('screen').then((l) => (lock = l)).catch(() => {});
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      lock?.release().catch(() => {});
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Music: started from the click that opened the presentation, so autoplay rules allow it; faded, never abrupt.
  const fadeAudio = useCallback((to: number, ms: number, then?: () => void) => {
    const a = audio.current;
    if (!a) return;
    const from = a.volume;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      a.volume = from + (to - from) * k;
      if (k < 1) requestAnimationFrame(step);
      else then?.();
    };
    requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const a = audio.current;
    if (!a || !musicUrl) return;
    if (musicOn && !paused && phase !== 'end') {
      a.volume = Math.min(a.volume, 0.01);
      a.play().then(() => fadeAudio(0.7, 1800)).catch(() => setMusicOn(false));
    } else if (phase === 'end') fadeAudio(0, 3000, () => a.pause());
    else fadeAudio(0, 500, () => a.pause());
  }, [musicOn, paused, phase, musicUrl, fadeAudio]);

  const goTo = useCallback((next: number) => {
    if (next < 0) next = 0;
    if (next >= slides.length) {
      setPhase('end');
      return;
    }
    setPrev(index);
    setIndex(next);
    elapsed.current = 0;
    setPhase('play');
  }, [index, slides.length]);

  // The clock: one rAF loop that respects pause and drives the progress bar without re-rendering.
  useEffect(() => {
    if (phase === 'end') return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      if (!paused) elapsed.current += dt;
      if (phase === 'intro') {
        if (elapsed.current >= INTRO_MS) {
          elapsed.current = 0;
          setPhase('play');
        }
      } else {
        if (progressBar.current) progressBar.current.style.transform = `scaleX(${(index + Math.min(1, elapsed.current / hold)) / slides.length})`;
        if (elapsed.current >= hold) {
          goTo(index + 1);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, paused, index, hold, slides.length, goTo]);

  // Drop the outgoing slide once the crossfade is over.
  useEffect(() => {
    if (prev == null) return;
    const t = setTimeout(() => setPrev(null), fade + 50);
    return () => clearTimeout(t);
  }, [prev, index, fade]);

  useEffect(() => {
    anims.current.forEach((a) => (paused ? a.pause() : a.play()));
  }, [paused]);

  const poke = useCallback(() => {
    setChrome(true);
    clearTimeout(idle.current);
    idle.current = setTimeout(() => setChrome(false), 2800);
  }, []);
  useEffect(() => {
    poke();
    return () => clearTimeout(idle.current);
  }, [poke]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else root.current?.requestFullscreen?.().catch(() => {});
  };
  const restart = () => {
    setPrev(null);
    setIndex(0);
    elapsed.current = 0;
    setPaused(false);
    setPhase('intro');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      poke();
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === 'ArrowRight') goTo(phase === 'intro' ? 0 : index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
      else if (e.key === 'Escape' && !document.fullscreenElement) onClose();
      else if (e.key.toLowerCase() === 'm' && musicUrl) setMusicOn((m) => !m);
      else if (e.key.toLowerCase() === 'f') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, index, onClose, poke, musicUrl, phase]);

  // Swipe between photos on touch screens; a tap shows or hides the controls.
  const swipe = useRef<{ x: number; t: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => (swipe.current = { x: e.clientX, t: Date.now() });
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || (e.target as HTMLElement).closest('button')) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 50 && Date.now() - s.t < 600) goTo(dx < 0 ? index + 1 : index - 1);
    else if (chrome && !paused) setChrome(false);
    else poke();
  };

  const showChrome = chrome || paused || phase === 'end';
  const btn = 'press grid size-11 place-items-center rounded-full text-white/85 hover:bg-white/10 hover:text-white';
  const register = useCallback((a: Animation) => {
    anims.current.add(a);
    if (paused) a.pause();
    a.finished.catch(() => {}).finally(() => anims.current.delete(a));
  }, [paused]);

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={`Apresentação: ${gallery.title}`}
      className="dark-room fixed inset-0 z-[70] cursor-none overflow-hidden bg-black text-white data-[chrome=true]:cursor-default"
      data-chrome={showChrome}
      data-paused={paused}
      onPointerMove={(e) => e.pointerType === 'mouse' && poke()}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={{ '--accent': studio.accent } as React.CSSProperties}
    >
      {musicUrl && <audio ref={audio} src={musicUrl} loop preload="auto" />}

      {phase !== 'intro' && prev != null && slides[prev] && (
        <SlideView key={`p-${slides[prev].key}`} slide={slides[prev]} move={MOVES[prev % MOVES.length]} hold={hold} fade={fade} aspect={aspect} reduced={reduced} register={register} entering={false} />
      )}
      {phase !== 'intro' && slides[index] && (
        <SlideView key={slides[index].key} slide={slides[index]} move={MOVES[index % MOVES.length]} hold={hold} fade={index === 0 && prev == null ? 2000 : fade} aspect={aspect} reduced={reduced} register={register} entering />
      )}
      {slides[index + 1] && slides[index + 1].photos.map((p) => <link key={p.id} rel="preload" as="image" href={p.display} />)}

      {phase === 'intro' && (
        <div className="absolute inset-0 grid place-items-center px-8 text-center">
          <div className="intro-card">
            <StudioMark studio={studio} tone="light" className="opacity-80" />
            <h2 className="font-display mt-6 text-[40px] leading-[1.05] sm:text-[64px]">{gallery.clientName}</h2>
            <p className="mt-4 text-[15px] text-white/70">{[gallery.title, gallery.eventDate && formatDate(gallery.eventDate)].filter(Boolean).join('  ·  ')}</p>
          </div>
        </div>
      )}

      {phase === 'end' && (
        <div className="end-card absolute inset-0 grid place-items-center bg-black px-8 text-center">
          <div>
            <h2 className="font-display text-[40px] leading-[1.05] sm:text-[60px]">{gallery.clientName}</h2>
            <p className="mt-3 text-[15px] text-white/65">{gallery.title}{gallery.eventDate ? `  ·  ${formatDate(gallery.eventDate)}` : ''}</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={onShowGallery} className="press h-12 rounded-full bg-white px-7 text-[15px] font-medium text-black hover:bg-white/90">Ver galeria</button>
              <button type="button" onClick={restart} className="press flex h-12 items-center gap-2 rounded-full px-5 text-[15px] text-white/85 hover:bg-white/10"><RotateCcw size={16} /> Assistir de novo</button>
            </div>
            <div className="mt-16 flex flex-col items-center gap-2 text-[13px] text-white/55">
              <StudioMark studio={studio} tone="light" className="opacity-80" />
              {[studio.instagram, studio.email].filter(Boolean).join('  ·  ')}
            </div>
          </div>
        </div>
      )}

      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${showChrome ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-[linear-gradient(rgb(0_0_0/0.45),transparent)] px-3 pb-10 pt-[max(env(safe-area-inset-top),10px)] sm:px-5">
          <p className="tnum pl-2 text-[13px] text-white/70">{phase === 'play' ? `${index + 1} / ${slides.length}` : ''}</p>
          <button type="button" onClick={onClose} aria-label="Sair da apresentação" className={`${btn} pointer-events-auto`}><X size={22} /></button>
        </div>
        {phase !== 'end' && (
          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgb(0_0_0/0.5))] px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-14 sm:px-5">
            <div className="pointer-events-auto flex items-center justify-between gap-2">
              <button type="button" onClick={() => setSpeed(NEXT_SPEED[speed])} aria-label={`Velocidade: ${SPEED[speed].label}. Tocar para mudar`} className="press h-11 min-w-[84px] rounded-full px-3 text-[13px] text-white/85 hover:bg-white/10">
                {SPEED[speed].label}
              </button>
              <div className="flex items-center gap-1 sm:gap-3">
                <button type="button" onClick={() => goTo(index - 1)} disabled={phase !== 'play' || index === 0} aria-label="Foto anterior" className={`${btn} disabled:opacity-30`}><ChevronLeft size={26} /></button>
                <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Continuar' : 'Pausar'} className="press grid size-14 place-items-center rounded-full bg-white text-black hover:bg-white/90">
                  {paused ? <Play size={22} fill="currentColor" className="translate-x-px" /> : <Pause size={22} fill="currentColor" />}
                </button>
                <button type="button" onClick={() => goTo(phase === 'intro' ? 0 : index + 1)} aria-label="Próxima foto" className={btn}><ChevronRight size={26} /></button>
              </div>
              <div className="flex min-w-[84px] items-center justify-end">
                {musicUrl && (
                  <button type="button" onClick={() => setMusicOn((m) => !m)} aria-pressed={musicOn} aria-label={musicOn ? 'Desligar música' : 'Ligar música'} className={btn}>
                    {musicOn ? <Music size={19} /> : <VolumeX size={19} />}
                  </button>
                )}
                {typeof document !== 'undefined' && document.fullscreenEnabled && (
                  <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'} className={`${btn} max-sm:hidden`}>
                    {fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/10">
        <div ref={progressBar} className="h-full origin-left bg-white/70" style={{ transform: 'scaleX(0)' }} />
      </div>
    </div>
  );
}

function SlideView({ slide, move, hold, fade, aspect, reduced, register, entering }: {
  slide: Slide; move: (typeof MOVES)[number]; hold: number; fade: number; aspect: number; reduced: boolean; entering: boolean; register: (a: Animation) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entering || !wrap.current || !inner.current) return;
    register(wrap.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fade, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'both' }));
    if (!reduced) {
      const [s0, s1, x0, x1, y0, y1] = move;
      register(inner.current.animate(
        [{ transform: `translate3d(${x0}%, ${y0}%, 0) scale(${s0})` }, { transform: `translate3d(${x1}%, ${y1}%, 0) scale(${s1})` }],
        { duration: hold + fade * 2, easing: 'cubic-bezier(0.33, 0, 0.67, 1)', fill: 'both' },
      ));
    }
  }, [entering, fade, hold, move, reduced, register]);

  const diptych = slide.photos.length === 2;
  return (
    <div ref={wrap} className="absolute inset-0">
      <div ref={inner} className={`absolute inset-0 will-change-transform ${diptych ? 'flex items-center justify-center gap-[1.2vw] px-[4vw]' : ''}`}>
        {slide.photos.map((p) => {
          const ratio = p.width / p.height;
          // Fill the frame when the photo's shape is close to the screen's; otherwise letterbox on black.
          const cover = !diptych && Math.abs(Math.log(ratio / aspect)) < 0.42;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={p.display}
              alt=""
              draggable={false}
              className={diptych ? 'h-[86%] w-auto max-w-[47%] object-contain' : `absolute inset-0 size-full ${cover ? 'object-cover' : 'object-contain'}`}
            />
          );
        })}
      </div>
    </div>
  );
}
