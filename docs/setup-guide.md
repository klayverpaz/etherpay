# Guia de Setup do EtherPay

Este guia parte do zero e leva um desenvolvedor até ter uma instância do EtherPay rodando localmente e publicada em uma URL pública na Netlify. Tudo em infraestrutura de plano gratuito com uso comercial permitido.

## Pré-requisitos

- **Node.js LTS (20.x)** e **pnpm 9+**. Instale o `nvm` se ainda não tiver:
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
  nvm install 20
  npm install -g pnpm
  ```
- **Docker Desktop** rodando — o Supabase CLI sobe o stack local em containers.
- **Conta no GitHub** (para o repositório).
- **Conta no Supabase** (gratuita; permite uso comercial).
- **Conta na Netlify** (gratuita; permite uso comercial; 100GB bandwidth/mês).

## 1. Clonar o repositório

```bash
git clone git@github.com:klayverpaz/etherpay.git
cd etherpay
pnpm install
```

Se ocorrer erro de build-script bloqueado pelo pnpm (nos pacotes `supabase` ou `sharp`), confirme as aprovações:

```bash
pnpm approve-builds
pnpm install
```

## 2. Stack local do Supabase

Inicialize (já está inicializado se você clonou; só executar se `supabase/config.toml` não existir):

```bash
pnpm exec supabase init
```

Suba o stack local:

```bash
pnpm exec supabase start
```

Aguarde os containers (Postgres + GoTrue + Storage + Studio) subirem. O CLI imprime URLs e chaves no final — copie:

- `API URL` (geralmente `http://127.0.0.1:54321`)
- `anon key` (formato `sb_publishable_...` ou JWT)
- `service_role key` (formato `sb_secret_...` ou JWT)
- Studio em `http://127.0.0.1:54323`

Aplique as migrations:

```bash
pnpm exec supabase db reset
```

Isso dropa o DB local, reroda as migrations `0001` até `0005` e recria o stack vazio.

Regenere os tipos TypeScript (opcional, já estão commitados):

```bash
pnpm db:types
```

## 3. Variáveis de ambiente

Copie o exemplo para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha com os valores do passo 2:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` é usado apenas em scripts administrativos (nunca em tempo de request). Nunca comite o `.env.local`.

## 4. Rodar localmente

```bash
pnpm dev
```

Acesse `http://localhost:3000`. Fluxo de validação inicial:

1. Você é redirecionado para `/sign-in`.
2. Clique em "Criar conta", registre-se com qualquer e-mail + senha (o Supabase local auto-confirma).
3. Após o login, você cai em `/hoje` — vazio na primeira vez.
4. Clique em **Clientes** → **Adicionar**, crie um cliente com vencimento hoje e valor padrão.
5. Volte para **Hoje** — a cobrança aparece.
6. Toque em **Ações** → **Marcar pago**, confirme. A linha some.
7. Vá para **Relatórios** — o valor pago aparece no total do mês.

Se qualquer passo falhar, veja "Troubleshooting" abaixo.

## 5. Projeto Supabase remoto (para produção)

1. Acesse `https://supabase.com`, crie um projeto free. Escolha região `sa-east-1` (São Paulo) para latência BR.
2. Em **Authentication → Providers**:
   - Habilite **Email** (com "Confirm email" **OFF** para simplificar v1, ou **ON** com template PT-BR caso queira confirmação obrigatória).
   - Habilite **Google** (opcional): configure client id/secret no Google Cloud Console e adicione o redirect URL `https://<seu-projeto>.supabase.co/auth/v1/callback`.
3. Em **Storage → New bucket**: crie um bucket privado chamado `attachments`. (As policies RLS são aplicadas pela migration 0004.)
4. Em **Project Settings → API**: copie a URL e as chaves (`anon` e `service_role`).
5. Instale o CLI em modo remoto e vincule:
   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <ref-do-projeto>
   ```
6. Aplique as migrations no remoto:
   ```bash
   pnpm exec supabase db push
   ```
   Confirme que as 5 migrations foram aplicadas. O trigger `handle_new_user` cria a row de `settings` automaticamente no primeiro login de cada usuário.

## 6. Deploy na Netlify

A Netlify detecta Next.js 14 automaticamente e provisiona o adapter (OpenNext) no build — **não é necessário instalar nenhum pacote no repositório**. O `netlify.toml` versionado já pina Node 20 e o comando de build.

1. Acesse `https://app.netlify.com` → **Add new site → Import an existing project**.
2. Autorize o GitHub e selecione o repositório `etherpay`.
3. Netlify detecta Next.js automaticamente. Confirme ou ajuste:
   - **Build command:** `next build` (herdado do `netlify.toml`)
   - **Publish directory:** `.next` (herdado do `netlify.toml`)
   - **Node version:** 20 (herdado do `netlify.toml` → `NODE_VERSION`)
4. **Environment variables** — em **Site settings → Environment variables**, adicione para o escopo "All deploy contexts" (produção + previews):
   - `NEXT_PUBLIC_SUPABASE_URL` → URL do projeto Supabase remoto
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon key do projeto remoto
   - `NEXT_PUBLIC_APP_URL` → URL final do deploy (ex.: `https://etherpay.netlify.app`). Atualize depois do primeiro deploy ou após configurar domínio customizado.
5. Clique em **Deploy site**. O primeiro build leva ~3 minutos.
6. Abra a URL publicada (formato `https://<nome-aleatorio>.netlify.app`) e rode o mesmo smoke-test do passo 4 — agora contra o Supabase remoto.

Cada PR recebe um **Deploy Preview URL** automático; pushes em `main` atualizam produção.

## 7. Domínio customizado (opcional)

No dashboard do site → **Domain management → Add custom domain**. Siga as instruções — Netlify emite certificado SSL via Let's Encrypt automaticamente após a propagação do DNS.

Depois do DNS propagar:

- Atualize `NEXT_PUBLIC_APP_URL` nas environment variables da Netlify para a nova URL.
- Em **Supabase → Authentication → URL Configuration**:
  - **Site URL:** a nova URL
  - **Redirect URLs:** adicione ambos `https://etherpay.app/**` e `https://*.netlify.app/**` (wildcard cobre os previews).

## 8. Troubleshooting

- **`pnpm install` erra em `supabase` ou `sharp` com "build script blocked"** → `.npmrc` já tem `approve-builds[]=supabase` e `approve-builds[]=sharp`. Rode `pnpm approve-builds` e `pnpm install` novamente.
- **`supabase start` erra com "Docker not running"** → abra o Docker Desktop e aguarde o indicador ficar verde.
- **Login via Google volta com "redirect_uri mismatch"** → no Supabase dashboard, vá em **Authentication → URL Configuration** e adicione a URL do preview Netlify (use wildcard `https://*.netlify.app/**`).
- **Cookies não persistem em modo anônimo** → o Supabase SSR depende de cookies first-party. Modo anônimo bloqueia alguns cookies cross-site; teste em modo normal.
- **Storage upload retorna 403** → verifique que o bucket `attachments` está criado e marcado como **Private**; as RLS policies devem estar aplicadas (migration 0004). No Studio, vá em **Storage → Policies** para confirmar.
- **`/hoje` demora a carregar** → a primeira request depois de minutos sem tráfego pode subir o projeto Supabase do estado "pausado" (free tier). Subsequentes são rápidas. A feature de daily-reminder-email (pós-v1) vai manter o projeto ativo.
- **Build Netlify falha com "Module not found"** → rode `pnpm build` localmente. Se passa local e falha no Netlify, verifique a `NODE_VERSION` no `netlify.toml` (deve ser 20).
- **PWA não instala** → abra Chrome DevTools → Lighthouse → categoria "Progressive Web App". Os erros apontam ao manifest ou ao service worker. Ícones devem estar em `public/icons/` (rode `pnpm icons` se sumirem).
- **Site suspenso após muito tráfego** → o free tier da Netlify tem limite mensal de 100GB de bandwidth, 300 minutos de build e 125k function invocations. Se estourar, o site é suspenso até o próximo mês ou até upgrade pra plano pago.

## 9. Logs e observabilidade

- **Netlify:** Dashboard do site → **Deploys → View details → Build log** (para build) ou **Logs → Functions** (para requests de runtime).
- **Supabase:** Dashboard → **Logs Explorer** (SQL, Auth, Storage, Functions). Filtros por timestamp + nível.
- **Browser:** console do DevTools para erros de client-side (falhas de upload, eventos PWA).

## 10. Checklist de pré-lançamento

- [ ] Ícones em `public/icons/` substituídos pela arte definitiva.
- [ ] `manifest.json` revisado (nome, cores, `start_url`).
- [ ] PWA passa no Lighthouse (audit "Installable" sem erros).
- [ ] Política de Privacidade + Termos de Uso hospedados em URL pública (pode ser GitHub Pages inicialmente).
- [ ] Google OAuth configurado com client id de produção (não de dev).
- [ ] Domínio customizado DNS propagado e certificado SSL ativo.
- [ ] `NEXT_PUBLIC_APP_URL` atualizado em Netlify.
- [ ] Supabase Auth com as URLs finais (site URL + redirect URLs).
- [ ] Smoke test completo na URL pública: sign-up, create client, mark paid, upload receipt, delete receipt, erase data.

## 11. Recursos deferidos (pós-v1)

- **Envio automático de lembretes por e-mail** (Supabase Edge Function + `pg_cron` + Resend): scaffolding presente em `settings.daily_reminder_time` + `settings.email_reminders_enabled`, mas nenhum código os consome ainda. Quando ativado, adicione `RESEND_API_KEY` como secret no Supabase (`supabase secrets set RESEND_API_KEY=...`) e `RESEND_FROM` com o e-mail verificado.
- **i18n (inglês)** — todas as strings estão em PT-BR hardcoded. Migração para `next-intl` + `en-US.json` deferida até haver demanda.
- **Assinatura paga** — `features/billing/gate.ts` retorna `true` para tudo; v2 troca por consulta a uma tabela `subscriptions` populada via webhook Stripe.
- **Offline mode** — mutações exigem rede. Service worker cacheia apenas assets estáticos.

---

Versionado junto do código. Atualize este arquivo sempre que a infra ou o processo de deploy mudar.
