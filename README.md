# Revela — entrega premium de fotografias

Galerias privadas para fotógrafos entregarem ensaios e eventos: abertura com capa, grade editorial, visualização em tela cheia, apresentação cinematográfica com música, favoritas, seleção formal, download individual, múltiplo e em ZIP. Painel do fotógrafo com galerias, envio de fotos, álbuns, regras de compartilhamento e identidade do estúdio.

Cada instalação é de um fotógrafo ou estúdio (não é SaaS).

- **Demonstração:** https://sendodonto.github.io/revela/ — painel: `clara@revela.demo` / `revela2026`, galeria com senha: `livraria`.

## Dois modos

| | Demonstração (GitHub Pages) | Instalação real (Vercel + Supabase) |
|---|---|---|
| Dados | `localStorage` + IndexedDB do navegador | Postgres do Supabase com RLS |
| Fotos | Arquivos guardados no navegador (originais, miniaturas e tamanho de exibição) | Bucket **privado** `galleries`, URLs assinadas de 3 h |
| Login do fotógrafo | Senha fixa de demonstração | Supabase Auth (cadastro desligado) |
| Senha da galeria | Conferida no navegador (mostra o fluxo, **não protege**) | Conferida no servidor (bcrypt via `pgcrypto`), cookie HMAC ligado à senha atual |
| Build | `npm run build:demo` → `out/` estático | `npm run build` → servidor Next.js com `/api/g/[slug]` |

O modo é escolhido pelas variáveis de ambiente: sem `NEXT_PUBLIC_SUPABASE_URL`, o app roda em demonstração.

## Instalar para um fotógrafo

1. Crie um projeto no [Supabase](https://supabase.com) (plano gratuito serve para começar).
2. No SQL Editor, rode `supabase/schema.sql` inteiro. Ele cria tabelas, RLS, funções de senha e o bucket privado `galleries`.
3. Em **Authentication → Providers → Email**, desligue “Allow new users to sign up”. Em **Authentication → Users**, crie o usuário do fotógrafo.
4. Na Vercel, importe o repositório e defina as variáveis (veja `.env.example`):

   | Variável | Onde aparece | Valor |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | navegador + servidor | URL do projeto |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navegador + servidor | chave `anon` (pública) |
   | `SUPABASE_SERVICE_ROLE_KEY` | **só servidor** | chave `service_role` — nunca com prefixo `NEXT_PUBLIC_` |
   | `GALLERY_COOKIE_SECRET` | **só servidor** | `openssl rand -hex 32` |
   | `NEXT_PUBLIC_MAX_UPLOAD_MB` | opcional | padrão 40 |
   | `NEXT_PUBLIC_MAX_FILES_PER_BATCH` | opcional | padrão 300 |

5. Entre em `/admin`, preencha **Estúdio** (nome, logotipo, cor, contatos) e crie a primeira galeria.

## Segurança

- O cliente não tem conta. A galeria só abre pelo link `/g/<cliente>-<8 caracteres aleatórios>` (32⁸ ≈ 10¹² combinações) e pelas regras dela: publicada, dentro da validade e desbloqueada.
- A chave `anon` não lê nada: toda tabela tem RLS limitada ao dono, e o público passa só por `src/app/api/g/[slug]/route.server.ts`, que reaplica cada regra (publicação, expiração, senha, download, favoritas, seleção) antes de usar a service role.
- Hash da senha fica em `gallery_secrets`, sem nenhuma policy: nem a sessão do fotógrafo lê.
- Originais só recebem URL assinada quando o download está liberado. Miniaturas e tamanho de exibição usam URLs assinadas de 3 h.
- Envio validado no navegador (tipo, tamanho, quantidade) e no bucket (`allowed_mime_types`, `file_size_limit` de 50 MB). As policies do Storage exigem que o caminho comece pelo id do dono.
- Exclusão apaga primeiro os arquivos do Storage e depois as linhas; se o Storage falhar, nada some do banco.

Limites conhecidos (anotados no código como `shortcut:`): o ZIP é montado na memória do navegador (bom para alguns GB); agregados do painel são contados no navegador; reordenar faz um UPDATE por foto; não há limite de tentativas de senha por IP (adicione rate limit na Vercel ou num middleware se precisar).

## Estrutura

```
src/
  app/                  rotas (App Router)
    g/[slug]/           galeria do cliente
    admin/              painel (entrar, início, galerias, galeria?id=, estúdio)
    api/g/[slug]/       API pública da galeria (route.server.ts, só no modo servidor)
    api/studio/         cartão público do estúdio
  components/
    gallery/            capa, grade justificada, lightbox, apresentação, downloads, seleção
    admin/              shell, envio de fotos, compartilhamento, clientes, informações
    ui/                 botão, campos, switch, sheet (<dialog>), confirmação, toasts
  services/             repositórios: demo (navegador), Supabase (painel), HTTP (cliente)
  lib/                  regras de acesso, slug, layout justificado, miniaturas, ZIP, formatação
supabase/schema.sql     banco, RLS, funções e bucket
tools/                  scripts que geram as fotos e a música da demonstração
```

## Desenvolvimento

```bash
npm install
npm run dev          # sem variáveis: modo demonstração
npm test             # regras de acesso, seleção, slug, layout, formatação
npm run build:demo   # export estático (GitHub Pages)
npm run build        # servidor (Vercel)
```

## Créditos da demonstração

Estúdio, clientes e contatos são fictícios. Fotos do [Pexels](https://www.pexels.com/license/) (uso livre), séries das páginas `pexels.com/photo/<id>` listadas em `src/data/demo-photos.json`. A música “Piano suave” foi sintetizada por `tools/make-music.py` para este projeto.
