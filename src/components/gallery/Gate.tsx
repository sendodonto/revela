'use client';
import { useState } from 'react';
import { ArrowRight, Clock, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Studio } from '@/types';
import { StudioMark } from './StudioMark';

/** Password, expired and not-found screens share one quiet wall with the studio's mark. */
export function Gate({ kind, title, studio, wrongPassword, onSubmit }: {
  kind: 'locked' | 'expired' | 'not-found';
  title?: string;
  studio?: Studio;
  wrongPassword?: boolean;
  onSubmit?: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const contact = studio && (studio.email || studio.instagram || studio.phone);

  return (
    <main className="flex min-h-dvh flex-col bg-wall px-6 pb-10 pt-8 sm:px-10" style={{ '--accent': studio?.accent } as React.CSSProperties}>
      {studio && <StudioMark studio={studio} />}
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
        {kind === 'locked' && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!password || !onSubmit) return;
              setBusy(true);
              await onSubmit(password);
              setBusy(false);
            }}
          >
            <LockKeyhole size={22} strokeWidth={1.6} className="text-ink-3" aria-hidden />
            <h1 className="font-display mt-5 text-[36px] leading-[1.08]">{title}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-3">Esta galeria é protegida. Digite a senha que você recebeu junto com o link.</p>
            <label htmlFor="gallery-password" className="mt-8 block text-[13px] font-medium text-ink-2">Senha</label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="gallery-password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={wrongPassword || undefined}
                aria-describedby={wrongPassword ? 'pw-error' : undefined}
                className="h-12 min-w-0 flex-1 rounded-full border border-rule-2 bg-paper px-5 text-[16px] focus:border-ink focus:outline-none aria-[invalid=true]:border-danger"
              />
              <Button type="submit" size="lg" loading={busy} aria-label="Entrar na galeria" className="w-12 px-0" icon={busy ? undefined : <ArrowRight size={18} />} />
            </div>
            {wrongPassword && <p id="pw-error" role="alert" className="mt-2 text-[14px] text-danger">Senha incorreta. Confira com quem enviou o link.</p>}
          </form>
        )}
        {kind === 'expired' && (
          <div>
            <Clock size={22} strokeWidth={1.6} className="text-ink-3" aria-hidden />
            <h1 className="font-display mt-5 text-[36px] leading-[1.08]">{title}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-3">O prazo desta galeria terminou. Fale com {studio?.name || 'o fotógrafo'} para pedir um novo acesso.</p>
          </div>
        )}
        {kind === 'not-found' && (
          <div>
            <h1 className="font-display text-[36px] leading-[1.08]">Galeria não encontrada</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-3">O link pode estar incompleto ou a galeria ainda não foi publicada. Confira o endereço que você recebeu.</p>
          </div>
        )}
        {contact && kind !== 'not-found' && (
          <p className="mt-10 border-t border-rule pt-5 text-[14px] leading-relaxed text-ink-3">
            {[studio.email, studio.instagram, studio.phone].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </main>
  );
}
