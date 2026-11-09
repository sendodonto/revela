'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { DEMO_LOGIN } from '@/data/seed';
import { DEMO } from '@/lib/config';
import { getAdmin } from '@/services';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO ? DEMO_LOGIN.email : '');
  const [password, setPassword] = useState(DEMO ? DEMO_LOGIN.password : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <main className="grid min-h-dvh bg-wall lg:grid-cols-2">
      <div className="hidden bg-room lg:block" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/demo/ensaio-beatriz-livraria/display/31987760.webp`} alt="" className="size-full object-cover opacity-90" />
      </div>
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="text-[15px] font-semibold">Revela</Link>
        <form
          className="mx-auto my-auto w-full max-w-sm py-12"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await getAdmin().signIn(email, password);
              router.replace('/admin');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
              setBusy(false);
            }
          }}
        >
          <h1 className="font-display text-[40px] leading-tight">Entrar no painel</h1>
          <p className="mt-2 text-[15px] text-ink-3">Galerias, clientes e a identidade do seu estúdio.</p>
          <div className="mt-8 grid gap-4">
            <Input label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Senha" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required error={error} />
          </div>
          <Button type="submit" size="lg" loading={busy} className="mt-6 w-full">Entrar</Button>
          {DEMO && <p className="mt-4 text-[13px] leading-relaxed text-ink-3">Demonstração: o acesso já vem preenchido e tudo o que você fizer fica neste navegador.</p>}
        </form>
      </div>
    </main>
  );
}
