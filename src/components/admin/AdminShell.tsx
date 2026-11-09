'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Images, LayoutGrid, LogOut, Palette } from 'lucide-react';
import { DEMO } from '@/lib/config';
import { getAdmin } from '@/services';

const NAV = [
  { href: '/admin', label: 'Início', icon: LayoutGrid, match: (p: string) => p === '/admin' },
  { href: '/admin/galerias', label: 'Galerias', icon: Images, match: (p: string) => p.startsWith('/admin/galeria') },
  { href: '/admin/estudio', label: 'Estúdio', icon: Palette, match: (p: string) => p.startsWith('/admin/estudio') },
];

/** Session guard + navigation. In a real installation RLS is the actual wall; this only keeps the UI honest. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = (usePathname() || '/admin').replace(/\/$/, '') || '/admin';
  const router = useRouter();
  const [state, setState] = useState<'checking' | 'in' | 'out'>('checking');
  const [email, setEmail] = useState('');
  const isLogin = path.endsWith('/admin/entrar');

  useEffect(() => {
    getAdmin().getSession().then((s) => {
      if (s) {
        setEmail(s.email);
        setState('in');
      } else {
        setState('out');
        if (!isLogin) router.replace('/admin/entrar');
      }
    });
  }, [isLogin, router, path]);

  if (isLogin) return <>{children}</>;
  if (state !== 'in') return <div className="min-h-dvh bg-wall" aria-busy="true" />;

  const signOut = async () => {
    await getAdmin().signOut();
    router.replace('/admin/entrar');
  };

  return (
    <div className="min-h-dvh bg-wall lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="material sticky top-0 z-30 border-b border-rule lg:h-dvh lg:border-b-0 lg:border-r lg:bg-wall-2/60">
        <div className="flex h-14 items-center justify-between px-4 lg:h-auto lg:flex-col lg:items-stretch lg:px-3 lg:pt-6">
          <Link href="/admin" className="px-2 text-[15px] font-semibold tracking-[-0.01em] lg:mb-6">Revela</Link>
          <nav aria-label="Painel" className="flex gap-0.5 lg:flex-col">
            {NAV.map(({ href, label, icon: Icon, match }) => {
              const active = match(path);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`press flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] transition-colors ${active ? 'bg-ink/[0.07] font-medium text-ink' : 'text-ink-2 hover:bg-ink/[0.04]'}`}
                >
                  <Icon size={16} strokeWidth={1.8} className="max-sm:hidden" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
          <button type="button" onClick={signOut} aria-label="Sair" title="Sair" className="press grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-ink/[0.05] lg:hidden">
            <LogOut size={17} />
          </button>
        </div>
        <div className="absolute inset-x-3 bottom-5 hidden lg:block">
          {DEMO && <p className="mb-3 px-2.5 text-[12px] leading-relaxed text-ink-3">Demonstração: os dados ficam guardados neste navegador.</p>}
          <p className="truncate px-2.5 text-[12px] text-ink-3">{email}</p>
          <button type="button" onClick={signOut} className="press mt-1 flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[14px] text-ink-2 hover:bg-ink/[0.04]">
            <LogOut size={16} strokeWidth={1.8} aria-hidden /> Sair
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        {DEMO && <p className="border-b border-rule bg-wall-2 px-4 py-2 text-center text-[12px] text-ink-2 lg:hidden">Demonstração: os dados ficam guardados neste navegador.</p>}
        {children}
      </div>
    </div>
  );
}

/** Page frame shared by admin screens: one title, optional actions, consistent width. */
export function AdminPage({ title, subtitle, actions, children, back }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; back?: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-[1180px] px-4 pb-24 pt-6 sm:px-8 lg:pt-10">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[34px] leading-[1.08] sm:text-[40px]">{title}</h1>
          {subtitle && <div className="mt-2 text-[14px] text-ink-3">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="mt-8">{children}</div>
    </main>
  );
}
