'use client';
import { useRef, useState } from 'react';
import { Copy, ExternalLink, LockKeyhole, Music } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Switch } from '@/components/ui/Switch';
import { getAdmin } from '@/services';
import { toast, toastError } from '@/store/toast';
import type { Gallery, ShareSettings } from '@/types';
import { galleryUrl } from './links';

/** Every sharing rule saves the moment it changes; the password is the one deliberate action. */
export function SharePanel({ gallery, onChange }: { gallery: Gallery; onChange: (g: Gallery) => void }) {
  const admin = getAdmin();
  const s = gallery.settings;
  const url = galleryUrl(gallery.slug);
  const [password, setPassword] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const musicInput = useRef<HTMLInputElement>(null);

  const save = async (patch: Partial<Gallery>, settings?: Partial<ShareSettings>, message = 'Salvo.') => {
    const next = { ...gallery, ...patch, settings: { ...s, ...settings } };
    onChange(next);
    try {
      await admin.updateGallery(next);
      toast(message);
    } catch (e) {
      onChange(gallery);
      toastError(e);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copiado.');
    } catch {
      toast('Não foi possível copiar. Selecione o link e copie manualmente.', 'error');
    }
  };

  const setPw = async (value: string | null) => {
    if (value !== null && value.length < 4) {
      toast('Use pelo menos 4 caracteres.', 'error');
      return;
    }
    setPwBusy(true);
    try {
      await admin.setPassword(gallery.id, value);
      onChange({ ...gallery, settings: { ...s, hasPassword: !!value } });
      setPassword('');
      toast(value ? 'Senha definida. Envie-a ao cliente junto com o link.' : 'Senha removida.');
    } catch (e) {
      toastError(e);
    } finally {
      setPwBusy(false);
    }
  };

  const section = 'border-b border-rule py-6 first:pt-0';
  const h = 'text-[17px] font-semibold';

  return (
    <div className="max-w-2xl">
      <section className={section}>
        <h2 className="text-[17px] font-semibold">Link da galeria</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Link da galeria" className="h-11 min-w-0 flex-1 rounded-full border border-rule-2 bg-wall-2 px-4 text-[14px] text-ink-2 focus:border-ink focus:outline-none" />
          <div className="flex gap-2">
            <Button variant="primary" icon={<Copy size={15} />} onClick={copy}>Copiar</Button>
            <a href={url} target="_blank" rel="noreferrer" className="press inline-flex h-11 items-center gap-2 rounded-full border border-rule-2 bg-paper px-4 text-[14px] font-medium hover:border-ink/40">
              <ExternalLink size={15} /> Abrir
            </a>
          </div>
        </div>
        <Switch
          checked={gallery.status === 'published'}
          onChange={(v) => save({ status: v ? 'published' : 'draft' }, undefined, v ? 'Galeria publicada. O link já funciona.' : 'Galeria despublicada. O link deixou de funcionar.')}
          label="Publicada"
          description={gallery.status === 'published' ? 'Quem tiver o link consegue abrir a galeria.' : 'Rascunho: o link mostra “galeria não encontrada” até você publicar.'}
        />
      </section>

      <section className={section}>
        <h3 className={h}>Acesso</h3>
        <div className="py-4">
          <p className="flex items-center gap-2 text-[15px] font-medium"><LockKeyhole size={15} /> Senha</p>
          <p className="mt-0.5 text-[13px] text-ink-3">{s.hasPassword ? 'A galeria pede senha. A senha não fica visível nem para você: para trocar, defina outra.' : 'Sem senha: basta o link.'}</p>
          <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setPw(password); }}>
            <input type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={s.hasPassword ? 'Nova senha' : 'Defina uma senha'} aria-label="Senha da galeria" maxLength={72}
              className="h-11 min-w-0 flex-1 rounded-full border border-rule-2 bg-paper px-4 text-[16px] focus:border-ink focus:outline-none sm:max-w-xs sm:text-[14px]" />
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" loading={pwBusy} disabled={!password}>{s.hasPassword ? 'Trocar senha' : 'Definir senha'}</Button>
              {s.hasPassword && <Button variant="ghost" className="text-danger" onClick={() => setPw(null)}>Remover</Button>}
            </div>
          </form>
        </div>
        <div className="py-4">
          <Input
            label="Expira em (opcional)"
            type="date"
            className="sm:max-w-xs"
            value={s.expiresAt ? s.expiresAt.slice(0, 10) : ''}
            onChange={(e) => save({}, { expiresAt: e.target.value ? `${e.target.value}T23:59:00-03:00` : null }, e.target.value ? 'Data de expiração salva.' : 'Expiração removida.')}
            hint="Depois desta data, o link mostra um aviso para o cliente falar com você."
          />
        </div>
      </section>

      <section className={section}>
        <h3 className={h}>O que o cliente pode fazer</h3>
        <div className="divide-y divide-rule">
          <Switch checked={s.allowDownload} onChange={(v) => save({}, { allowDownload: v })} label="Baixar fotos" description="Foto por foto, várias de uma vez ou a galeria inteira em ZIP, em alta resolução." />
          <Switch checked={s.allowFavorites} onChange={(v) => save({}, { allowFavorites: v })} label="Favoritar" description="Coração em cada foto. Você vê as favoritas na aba Clientes." />
          <Switch checked={s.allowSelection} onChange={(v) => save({}, { allowSelection: v })} label="Seleção formal" description="O cliente escolhe as fotos para álbum ou edição e envia a lista final, que fica travada até você reabrir." />
          {s.allowSelection && (
            <div className="pb-4">
              <Input label="Limite de fotos na seleção" type="number" min={1} max={5000} className="sm:max-w-[200px]" defaultValue={s.selectionLimit ?? ''} placeholder="Sem limite" hint="Salvo ao sair do campo."
                onBlur={(e) => {
                  const v = e.target.value ? Math.max(1, Math.min(5000, Math.floor(Number(e.target.value)))) : null;
                  if (v !== s.selectionLimit) save({}, { selectionLimit: v });
                }} />
            </div>
          )}
        </div>
      </section>

      <section className={section}>
        <h3 className={h}>Apresentação</h3>
        <div className="divide-y divide-rule">
          <Switch checked={s.presentation} onChange={(v) => save({}, { presentation: v })} label="Apresentação cinematográfica" description="Tela cheia, transições suaves e movimento lento sobre cada foto." />
          {s.presentation && (
            <>
              <div className="py-4">
                <label htmlFor="slide-seconds" className="flex items-baseline justify-between text-[15px] font-medium">
                  Tempo de cada foto <span className="tnum text-[14px] font-normal text-ink-2">{s.slideSeconds} s</span>
                </label>
                <input id="slide-seconds" type="range" min={3} max={15} step={1} value={s.slideSeconds} onChange={(e) => onChange({ ...gallery, settings: { ...s, slideSeconds: Number(e.target.value) } })}
                  onPointerUp={(e) => save({}, { slideSeconds: Number((e.target as HTMLInputElement).value) })} onKeyUp={(e) => save({}, { slideSeconds: Number((e.target as HTMLInputElement).value) })}
                  className="mt-3 w-full accent-ink" />
                <p className="mt-1 text-[13px] text-ink-3">O cliente ainda pode deixar mais lento ou mais rápido durante a apresentação.</p>
              </div>
              <div className="py-4">
                <p className="flex items-center gap-2 text-[15px] font-medium"><Music size={15} /> Música</p>
                <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Música da apresentação">
                  {([[null, 'Sem música'], ['ambiente', 'Piano suave (incluída)'], ['custom', 'Minha música']] as const).map(([v, label]) => (
                    <button key={label} type="button" role="radio" aria-checked={s.music === v}
                      onClick={() => (v === 'custom' && s.music !== 'custom' ? musicInput.current?.click() : save({}, { music: v }))}
                      className={`press h-9 rounded-full border px-3.5 text-[14px] ${s.music === v ? 'border-ink bg-ink text-wall' : 'border-rule-2 text-ink-2 hover:border-ink/40'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                {s.music === 'custom' && <button type="button" onClick={() => musicInput.current?.click()} className="mt-2 text-[13px] text-ink-2 underline">Trocar arquivo de música</button>}
                <input ref={musicInput} type="file" accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg" className="sr-only" tabIndex={-1}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    if (f.size > 20 * 1024 * 1024) return toast('Use um arquivo de até 20 MB.', 'error');
                    try {
                      await admin.uploadMusic(gallery.id, f);
                      onChange({ ...gallery, settings: { ...s, music: 'custom' } });
                      toast('Música enviada.');
                    } catch (err) {
                      toastError(err);
                    }
                  }} />
                <p className="mt-2 text-[13px] leading-relaxed text-ink-3">A música só começa quando o cliente toca em “Assistir”, e pode ser desligada a qualquer momento. Use apenas músicas que você tem direito de usar.</p>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
