'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { plural } from '@/lib/format';

/** Final step of the formal selection: who is choosing, an optional note, and an honest warning that it locks. */
export function SubmitSheet({ open, onClose, count, studioName, onSubmit }: {
  open: boolean;
  onClose: () => void;
  count: number;
  studioName: string;
  onSubmit: (name: string, note: string) => Promise<boolean>;
}) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Sheet open={open} onClose={onClose} title="Enviar seleção">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) {
            setError('Informe seu nome.');
            return;
          }
          setBusy(true);
          const ok = await onSubmit(name, note);
          setBusy(false);
          if (ok) onClose();
        }}
        className="grid gap-4"
      >
        <p className="tnum text-[15px] leading-relaxed text-ink-2">
          Você escolheu <strong className="font-semibold text-ink">{plural(count, 'fotografia', 'fotografias')}</strong>. Depois de enviar, {studioName || 'o fotógrafo'} recebe a lista e a seleção fica fechada para alterações.
        </p>
        <Input label="Seu nome" value={name} onChange={(e) => { setName(e.target.value); setError(null); }} error={error} autoComplete="name" maxLength={80} required />
        <Textarea label="Recado para o fotógrafo (opcional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Ex.: a 12 em preto e branco, por favor" />
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>Continuar escolhendo</Button>
          <Button type="submit" loading={busy}>Enviar seleção</Button>
        </div>
      </form>
    </Sheet>
  );
}
