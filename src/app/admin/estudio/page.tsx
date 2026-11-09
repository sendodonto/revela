'use client';
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { AdminPage } from '@/components/admin/AdminShell';
import { StudioMark } from '@/components/gallery/StudioMark';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { getAdmin } from '@/services';
import { toast, toastError } from '@/store/toast';
import type { Studio } from '@/types';

const PRESETS = ['#a33a2a', '#121212', '#5b6b4a', '#2f4a6b', '#8a6a3c', '#7a4a6b'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

/** The photographer's identity: what every client sees on the gallery, the presentation and the gate screens. */
export default function StudioPage() {
  const admin = getAdmin();
  const [studio, setStudio] = useState<Studio | null>(null);
  const [saved, setSaved] = useState<Studio | null>(null);
  const [preview, setPreview] = useState<{ logo: string | null; cover: string | null }>({ logo: null, cover: null });
  const [busy, setBusy] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    admin.getStudio().then(async (s) => {
      setStudio(s);
      setSaved(s);
      setPreview({ logo: await admin.brandUrl(s.logo), cover: await admin.brandUrl(s.cover) });
    }).catch((e) => toastError(e));
  }, [admin]);

  if (!studio) return <AdminPage title="Estúdio"><div className="skeleton h-96 max-w-2xl rounded" /></AdminPage>;

  const set = (k: keyof Studio) => (e: React.ChangeEvent<HTMLInputElement>) => setStudio({ ...studio, [k]: e.target.value });
  const upload = async (kind: 'logo' | 'cover', file?: File) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || (kind === 'cover' && file.type === 'image/svg+xml')) return toast('Use JPEG, PNG ou WebP' + (kind === 'logo' ? ' (ou SVG).' : '.'), 'error');
    if (file.size > 15 * 1024 * 1024) return toast('Use uma imagem de até 15 MB.', 'error');
    try {
      const ref = await admin.uploadBrandAsset(kind, file);
      setStudio((s) => (s ? { ...s, [kind]: ref } : s));
      setPreview((p) => ({ ...p, [kind]: URL.createObjectURL(file) }));
    } catch (e) {
      toastError(e);
    }
  };
  const dirty = JSON.stringify(studio) !== JSON.stringify(saved);
  const validAccent = /^#[0-9a-fA-F]{6}$/.test(studio.accent);

  return (
    <AdminPage title="Estúdio" subtitle="Sua marca nas galerias, na apresentação e na tela de senha.">
      <form
        className="grid max-w-5xl gap-12 lg:grid-cols-[minmax(0,1fr)_360px]"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!studio.name.trim()) return toast('Informe o nome do estúdio.', 'error');
          if (!validAccent) return toast('A cor precisa estar no formato #RRGGBB.', 'error');
          setBusy(true);
          try {
            await admin.saveStudio(studio);
            setSaved(studio);
            toast('Estúdio salvo.');
          } catch (err) {
            toastError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid content-start gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Nome do estúdio" value={studio.name} onChange={set('name')} maxLength={80} required />
            <Input label="Seu nome" value={studio.photographerName} onChange={set('photographerName')} maxLength={80} hint="Usado na saudação do painel e na página inicial." />
          </div>
          <Input label="Cidade" value={studio.city} onChange={set('city')} maxLength={80} className="sm:max-w-xs" />

          <h2 className="mt-6 text-[17px] font-semibold">Contato</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="E-mail" type="email" value={studio.email} onChange={set('email')} maxLength={120} />
            <Input label="WhatsApp ou telefone" type="tel" value={studio.phone} onChange={set('phone')} maxLength={40} />
            <Input label="Instagram" value={studio.instagram} onChange={set('instagram')} maxLength={60} placeholder="@seuestudio" />
            <Input label="Site" type="url" value={studio.website} onChange={set('website')} maxLength={120} placeholder="https://" />
          </div>

          <h2 className="mt-6 text-[17px] font-semibold">Identidade</h2>
          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-2">Cor de destaque</p>
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((c) => (
                <button key={c} type="button" onClick={() => setStudio({ ...studio, accent: c })} aria-label={`Usar a cor ${c}`} aria-pressed={studio.accent.toLowerCase() === c}
                  className={`press size-9 rounded-full ring-offset-2 ring-offset-wall ${studio.accent.toLowerCase() === c ? 'ring-2 ring-ink' : ''}`} style={{ background: c }} />
              ))}
              <label className="ml-1 flex items-center gap-2">
                <span className="sr-only">Cor personalizada</span>
                <input type="color" value={validAccent ? studio.accent : '#a33a2a'} onChange={set('accent')} className="size-9 cursor-pointer rounded-full border border-rule-2 bg-paper p-0.5" />
                <input value={studio.accent} onChange={set('accent')} aria-label="Código da cor" maxLength={7} className="h-9 w-24 rounded-full border border-rule-2 bg-paper px-3 text-[13px] uppercase focus:border-ink focus:outline-none" />
              </label>
            </div>
            <p className="mt-2 text-[13px] text-ink-3">Aparece só onde o cliente age: coração das favoritas e fotos escolhidas.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-2">Logotipo</p>
              <div className="flex h-24 items-center justify-center border border-dashed border-rule-2 bg-paper px-4">
                {preview.logo ? <img src={preview.logo} alt="Logotipo atual" className="max-h-14 max-w-full object-contain" /> : <span className="text-[13px] text-ink-3">Sem logotipo: usamos o nome do estúdio</span>}
              </div>
              <div className="mt-2 flex gap-3 text-[13px]">
                <button type="button" onClick={() => logoInput.current?.click()} className="flex items-center gap-1 text-ink underline"><ImagePlus size={13} /> {studio.logo ? 'Trocar' : 'Enviar'}</button>
                {studio.logo && <button type="button" onClick={() => { setStudio({ ...studio, logo: null }); setPreview((p) => ({ ...p, logo: null })); }} className="flex items-center gap-1 text-danger"><Trash2 size={13} /> Remover</button>}
              </div>
              <input ref={logoInput} type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" tabIndex={-1} onChange={(e) => { upload('logo', e.target.files?.[0]); e.target.value = ''; }} />
              <p className="mt-1 text-[12px] text-ink-3">PNG ou SVG com fundo transparente fica melhor. Sobre fotos, ele aparece em branco.</p>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-2">Foto de capa do estúdio</p>
              <div className="h-24 overflow-hidden border border-rule-2 bg-wall-2">
                {preview.cover && <img src={preview.cover} alt="Capa atual" className="size-full object-cover" />}
              </div>
              <div className="mt-2 flex gap-3 text-[13px]">
                <button type="button" onClick={() => coverInput.current?.click()} className="flex items-center gap-1 text-ink underline"><ImagePlus size={13} /> {studio.cover ? 'Trocar' : 'Enviar'}</button>
              </div>
              <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => { upload('cover', e.target.files?.[0]); e.target.value = ''; }} />
              <p className="mt-1 text-[12px] text-ink-3">Usada na página inicial do estúdio.</p>
            </div>
          </div>
          <div className="mt-4"><Button type="submit" loading={busy} disabled={!dirty}>Salvar estúdio</Button></div>
        </div>

        <aside aria-label="Prévia" className="lg:sticky lg:top-10 lg:self-start">
          <p className="mb-3 text-[13px] font-medium text-ink-2">Prévia na galeria do cliente</p>
          <div className="overflow-hidden border border-rule bg-wall" style={{ '--accent': validAccent ? studio.accent : '#a33a2a' } as React.CSSProperties}>
            <div className="relative h-40 bg-room">
              {preview.cover && <img src={preview.cover} alt="" className="size-full object-cover opacity-90" />}
              <div className="absolute left-4 top-4"><StudioMark studio={{ name: studio.name, logo: preview.logo }} tone="light" /></div>
            </div>
            <div className="p-5">
              <p className="text-[13px] text-ink-2">Ana & Pedro</p>
              <p className="font-display mt-1 text-[30px] leading-none">Casamento</p>
              <div className="mt-4 flex items-center gap-3 text-[13px] text-ink-2">
                <span className="inline-flex h-8 items-center rounded-full bg-ink px-4 text-wall">Ver galeria</span>
                <span className="flex items-center gap-1"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.1 3.4 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 6 3.6 4.5 7.3C19.5 16.4 12 21 12 21Z" fill="var(--color-accent)" /></svg> Favorita</span>
              </div>
            </div>
            <p className="border-t border-rule px-5 py-3 text-[12px] text-ink-3">{[studio.email, studio.instagram, studio.phone].filter(Boolean).join(' · ') || 'Seus contatos aparecem aqui'}</p>
          </div>
        </aside>
      </form>
    </AdminPage>
  );
}
