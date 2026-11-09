'use client';
import { ChevronRight, Heart, Images, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Misc';
import { Sheet } from '@/components/ui/Sheet';
import { formatBytes, plural } from '@/lib/format';

export interface DownloadJob { done: number; total: number; label: string }

/** Whole gallery, favorites, or a hand-picked set; shows real progress while the ZIP is assembled. */
export function DownloadSheet({ open, onClose, total, totalBytes, favorites, job, onAll, onFavorites, onPick, onCancel }: {
  open: boolean;
  onClose: () => void;
  total: number;
  totalBytes: number;
  favorites: number;
  job: DownloadJob | null;
  onAll: () => void;
  onFavorites: () => void;
  onPick: () => void;
  onCancel: () => void;
}) {
  const row = 'press flex w-full items-center gap-4 border-b border-rule py-4 text-left last:border-0 hover:bg-ink/[0.02] disabled:opacity-40';
  return (
    <Sheet open={open} onClose={onClose} title="Baixar fotografias">
      {job ? (
        <div className="pb-2" aria-live="polite">
          <p className="text-[15px] font-medium">{job.label}</p>
          <p className="tnum mt-1 text-[14px] text-ink-3">
            {job.done < job.total ? `Preparando ${job.done + 1} de ${job.total}…` : 'Salvando o arquivo…'}
          </p>
          <Progress value={job.total ? job.done / job.total : 0} label="Progresso do download" className="mt-4" />
          <p className="mt-4 text-[13px] leading-relaxed text-ink-3">Deixe esta página aberta até o arquivo aparecer nos seus downloads.</p>
          <Button variant="secondary" className="mt-5" onClick={onCancel}>Cancelar</Button>
        </div>
      ) : (
        <div>
          <button type="button" className={row} onClick={onAll}>
            <Images size={20} strokeWidth={1.6} className="shrink-0 text-ink-2" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">Galeria completa</span>
              <span className="tnum block text-[13px] text-ink-3">{plural(total, 'fotografia', 'fotografias')} em alta resolução · {formatBytes(totalBytes)} · arquivo ZIP</span>
            </span>
            <ChevronRight size={18} className="text-ink-3" aria-hidden />
          </button>
          <button type="button" className={row} onClick={onFavorites} disabled={!favorites}>
            <Heart size={20} strokeWidth={1.6} className="shrink-0 text-ink-2" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">Minhas favoritas</span>
              <span className="tnum block text-[13px] text-ink-3">{favorites ? plural(favorites, 'fotografia', 'fotografias') : 'Você ainda não favoritou nenhuma'}</span>
            </span>
            <ChevronRight size={18} className="text-ink-3" aria-hidden />
          </button>
          <button type="button" className={row} onClick={onPick}>
            <ListChecks size={20} strokeWidth={1.6} className="shrink-0 text-ink-2" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">Escolher fotos</span>
              <span className="block text-[13px] text-ink-3">Toque nas fotos que quer baixar</span>
            </span>
            <ChevronRight size={18} className="text-ink-3" aria-hidden />
          </button>
        </div>
      )}
    </Sheet>
  );
}
