'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { AdminPage } from '@/components/admin/AdminShell';
import { GalleryRow, useCovers } from '@/components/admin/GalleryRow';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Misc';
import { formatBytes, formatNumber, plural, relativeTime } from '@/lib/format';
import { getAdmin } from '@/services';
import { toastError } from '@/store/toast';
import type { GallerySummary, Selection, Stats, Studio } from '@/types';
import { useRouter } from 'next/navigation';

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Dashboard() {
  const router = useRouter();
  const [studio, setStudio] = useState<Studio | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [galleries, setGalleries] = useState<GallerySummary[] | null>(null);
  const [selections, setSelections] = useState<(Selection & { gallery: GallerySummary })[]>([]);
  const recent = useMemo(() => galleries?.slice(0, 5) ?? [], [galleries]);
  const covers = useCovers(recent);

  useEffect(() => {
    const admin = getAdmin();
    Promise.all([admin.getStudio(), admin.stats(), admin.listGalleries()])
      .then(async ([s, st, gs]) => {
        setStudio(s);
        setStats(st);
        setGalleries(gs);
        const withSelection = gs.filter((g) => g.selectionsSubmitted > 0);
        const lists = await Promise.all(withSelection.map(async (g) => (await admin.listSelections(g.id)).filter((x) => x.status === 'submitted').map((x) => ({ ...x, gallery: g }))));
        setSelections(lists.flat().sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '')).slice(0, 4));
      })
      .catch((e) => toastError(e, 'Não foi possível carregar o painel.'));
  }, []);

  const first = studio?.photographerName.split(' ')[0];
  const figures = stats && [
    { label: 'Galerias', value: formatNumber(stats.galleries), note: `${stats.published} publicadas` },
    { label: 'Fotografias', value: formatNumber(stats.photos), note: `${formatBytes(stats.bytes)} armazenados` },
    { label: 'Visualizações', value: formatNumber(stats.views), note: 'aberturas de galeria' },
    { label: 'Downloads', value: formatNumber(stats.downloads), note: 'fotos baixadas' },
  ];

  return (
    <AdminPage
      title={studio ? `${greeting()}${first ? `, ${first}` : ''}.` : ' '}
      subtitle={studio?.name}
      actions={<Button icon={<Plus size={16} />} onClick={() => router.push('/admin/galerias?nova=1')}>Nova galeria</Button>}
    >
      <dl className="grid grid-cols-2 border-y border-rule md:grid-cols-4">
        {(figures ?? Array.from({ length: 4 }, () => null)).map((f, i) => (
          <div key={i} className={`py-5 ${i % 2 ? 'pl-5' : 'pr-5'} md:px-6 md:first:pl-0 ${i > 0 ? 'md:border-l md:border-rule' : ''} ${i === 1 ? 'border-l border-rule' : ''} ${i === 3 ? 'border-l border-rule' : ''} ${i > 1 ? 'border-t border-rule md:border-t-0' : ''}`}>
            {f ? (
              <>
                <dt className="text-[13px] text-ink-3">{f.label}</dt>
                <dd className="tnum mt-1 text-[28px] font-medium tracking-[-0.02em]">{f.value}</dd>
                <dd className="tnum text-[12px] text-ink-3">{f.note}</dd>
              </>
            ) : (
              <div className="skeleton h-16 rounded" />
            )}
          </div>
        ))}
      </dl>

      <div className="mt-12 grid gap-12 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="recentes">
          <div className="flex items-baseline justify-between">
            <h2 id="recentes" className="text-[17px] font-semibold">Galerias recentes</h2>
            <Link href="/admin/galerias" className="flex items-center gap-1 text-[14px] text-ink-2 hover:text-ink">Todas <ArrowRight size={14} /></Link>
          </div>
          {galleries === null ? (
            <div className="mt-4 grid gap-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 rounded" />)}</div>
          ) : galleries.length ? (
            <ul className="mt-2">{galleries.slice(0, 5).map((g) => <GalleryRow key={g.id} g={g} cover={covers[g.id]} />)}</ul>
          ) : (
            <Empty title="Sua primeira galeria" action={<Button icon={<Plus size={16} />} onClick={() => router.push('/admin/galerias?nova=1')}>Criar galeria</Button>}>
              Crie uma galeria, envie as fotos do ensaio e mande o link para o cliente.
            </Empty>
          )}
        </section>

        <section aria-labelledby="selecoes">
          <h2 id="selecoes" className="text-[17px] font-semibold">Seleções recebidas</h2>
          {selections.length ? (
            <ul className="mt-2">
              {selections.map((s) => (
                <li key={s.id} className="border-b border-rule last:border-0">
                  <Link href={`/admin/galeria?id=${s.galleryId}&aba=clientes`} className="-mx-3 block rounded-xl px-3 py-3.5 hover:bg-ink/[0.025]">
                    <p className="text-[15px] font-medium">{s.clientName}</p>
                    <p className="tnum text-[13px] text-ink-3">{s.gallery.title} · {plural(s.photoIds.length, 'foto', 'fotos')} · {relativeTime(s.submittedAt!)}</p>
                    {s.note && <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-2">“{s.note}”</p>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] leading-relaxed text-ink-3">Quando um cliente enviar a escolha das fotos de uma galeria com seleção ativa, ela aparece aqui.</p>
          )}
        </section>
      </div>
    </AdminPage>
  );
}
