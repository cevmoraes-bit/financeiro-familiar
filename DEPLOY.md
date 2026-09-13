# Deploy — Financeiro Familiar (FinControl)

## Arquitetura atual

O frontend (React + Vite) fala **diretamente com o Supabase** — autenticação
(email/senha) e dados (tabela `transactions`) via `@supabase/supabase-js`.
Não há mais dependência do Atoms Cloud (SDK anterior) nem do backend FastAPI
em `app/backend` — esse backend fica no repositório como referência/futuro
uso, mas o app publicado hoje não o chama.

## 1. Supabase (já provisionado)

- Projeto: **Financeiro Familiar** (ref `yeybotynmizuurwfayqj`, região `ca-central-1`)
- Tabela `transactions` criada com RLS (cada usuário só vê/edita as próprias
  transações), colunas: `id, user_id, type, amount, category, description, date, created_at`
- Auth por email/senha habilitada (padrão do Supabase)
- URL: `https://yeybotynmizuurwfayqj.supabase.co`

Nada a fazer aqui, a não ser revisar em **Authentication > Settings** se você
quer exigir confirmação de email antes do primeiro login (ativado por padrão).

## 2. Variáveis de ambiente do frontend

Arquivo `app/frontend/.env` (já criado, não commitado — veja `.env.example`):

```
VITE_SUPABASE_URL=https://yeybotynmizuurwfayqj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable__SdnHZZv7JE-5JeZO8d5vw_kjcQfoN8
```

Essa chave é a **publicável (anon)** — segura para expor no frontend; o
acesso aos dados é controlado pelas policies de RLS, não pelo sigilo da chave.

## 3. Rodando localmente

```bash
cd app/frontend
pnpm install
pnpm dev
```

⚠️ Não consegui rodar `pnpm install` / `pnpm build` no ambiente onde preparei
este projeto (sem acesso à internet), então revisei manualmente todas as
importações e referências trocadas, mas o build real ainda não foi validado
por uma máquina com rede. Rode `pnpm build` localmente antes do deploy para
confirmar que fecha sem erros.

## 4. GitHub

Repositório: `financeirophoenixseg-stack/financeiro-familiar`

```bash
git add -A
git commit -m "Reescreve frontend para usar Supabase diretamente"
git push origin main
```

## 5. Vercel

1. Em vercel.com, **Add New > Project** e importe o repositório
   `financeirophoenixseg-stack/financeiro-familiar`.
2. **Root Directory**: `app/frontend`
3. **Framework Preset**: Vite
4. **Build Command**: `pnpm build` (ou deixe o padrão detectado)
5. **Output Directory**: `dist`
6. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = `https://yeybotynmizuurwfayqj.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable__SdnHZZv7JE-5JeZO8d5vw_kjcQfoN8`
7. Deploy.

Não tenho um conector de Vercel com permissão de criar deploy (o que existe
no meu ambiente só consulta projetos/deployments existentes), então esse
passo também precisa ser feito por você — mas com tudo já configurado acima,
é só apontar e clicar em Deploy.
