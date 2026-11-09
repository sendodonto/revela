'use client';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { Button } from './Button';
import { Input } from './Field';
import { Sheet } from './Sheet';

type Ask =
  | { kind: 'confirm'; title: string; message: string; confirm: string; danger?: boolean; resolve: (ok: boolean) => void }
  | { kind: 'text'; title: string; label: string; value: string; confirm: string; resolve: (v: string | null) => void };
const useAsk = create<{ ask: Ask | null }>(() => ({ ask: null }));

/** await confirm({...}) before anything destructive; resolves false on cancel, Esc or backdrop. */
export const confirm = (o: { title: string; message: string; confirm: string; danger?: boolean }) =>
  new Promise<boolean>((resolve) => useAsk.setState({ ask: { kind: 'confirm', ...o, resolve } }));

/** await promptText({...}) for a short name; resolves null on cancel. */
export const promptText = (o: { title: string; label: string; value?: string; confirm: string }) =>
  new Promise<string | null>((resolve) => useAsk.setState({ ask: { kind: 'text', value: '', ...o, resolve } }));

export function ConfirmHost() {
  const ask = useAsk((s) => s.ask);
  const [text, setText] = useState('');
  useEffect(() => {
    if (ask?.kind === 'text') setText(ask.value);
  }, [ask]);

  const done = (ok: boolean) => {
    if (ask?.kind === 'confirm') ask.resolve(ok);
    if (ask?.kind === 'text') ask.resolve(ok && text.trim() ? text.trim() : null);
    useAsk.setState({ ask: null });
  };
  return (
    <Sheet open={!!ask} onClose={() => done(false)} title={ask?.title ?? ''}>
      <form onSubmit={(e) => { e.preventDefault(); done(true); }}>
        {ask?.kind === 'confirm' && <p className="text-[15px] leading-relaxed text-ink-2">{ask.message}</p>}
        {ask?.kind === 'text' && <Input label={ask.label} value={text} onChange={(e) => setText(e.target.value)} maxLength={80} autoFocus />}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => done(false)}>Cancelar</Button>
          <Button type="submit" variant={ask?.kind === 'confirm' && ask.danger ? 'danger' : 'primary'} disabled={ask?.kind === 'text' && !text.trim()}>{ask?.confirm}</Button>
        </div>
      </form>
    </Sheet>
  );
}
