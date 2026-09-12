# Deploy — Financeiro Familiar

## 1. Banco de dados (Supabase)

1. Crie o projeto no Supabase (ou use um existente).
2. Em **Project Settings > Database > Connection string**, copie a URL no modo
   **Transaction pooler** (porta 6543).
3. Monte a `DATABASE_URL` no formato assíncrono:
   `postgresql+asyncpg://postgres:[SENHA]@[HOST].pooler.supabase.com:6543/postgres`
4. Copie `app/backend/.env.example` para `app/backend/.env` e preencha os valores
   (`DATABASE_URL`, `JWT_SECRET_KEY`, etc). **Nunca commite o `.env`.**
5. Rode as migrations:
   ```bash
   cd app/backend
   pip install -r requirements.txt
   alembic upgrade head
   ```

## 2. GitHub

Repositório de destino: `financeiro-familiar`

```bash
# 1. Crie o repositório vazio em https://github.com/new (nome: financeiro-familiar)
# 2. Dentro da pasta do projeto:
git remote add origin https://github.com/<SEU-USUARIO>/financeiro-familiar.git
git branch -M main
git push -u origin main
```

## 3. Rodando localmente

```bash
# Backend
cd app/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd app/frontend
pnpm install
pnpm dev
```

## Variáveis de ambiente

Veja `app/backend/.env.example` para a lista completa.
