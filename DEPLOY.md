# Deploy — Financeiro Familiar

## 1. Banco de dados (Supabase)

✅ Já provisionado: projeto **"Financeiro Familiar"** (ref `yeybotynmizuurwfayqj`, região `ca-central-1`),
com o schema completo aplicado (`contas`, `cartoes`, `categorias`, `lancamentos`, `metas`,
`orcamento`, `contas_pagar`, `valores_receber`, `documentos`, `compras_cartao`) e RLS habilitado
em todas as tabelas.

Passos restantes:
1. Pegue a senha do banco em **Supabase Dashboard > Project Settings > Database > Connection string**
   (modo **Transaction pooler**, porta 6543).
2. Copie `app/backend/.env.example` para `app/backend/.env` e preencha `DATABASE_URL` com a senha
   e o restante das variáveis (`JWT_SECRET_KEY`, etc). **Nunca commite o `.env`.**
3. Como o schema já existe no banco, normalmente não é preciso rodar `alembic upgrade head` de novo —
   só rode se quiser conferir/alinhar o estado das migrations:
   ```bash
   cd app/backend
   pip install -r requirements.txt
   alembic upgrade head
   ```
4. ⚠️ Aviso do linter de segurança do Supabase: a tabela `categorias` tem RLS habilitado mas
   nenhuma policy criada — hoje ela fica inacessível via API até uma policy ser adicionada
   (a menos que o acesso seja só via `service_role`, que ignora RLS). Vale revisar antes de ir
   para produção.

## 2. GitHub

Repositório de destino: `financeiro-familiar`

```bash
# 1. Crie o repositório vazio em https://github.com/new (nome: financeiro-familiar)
# 2. Dentro da pasta do projeto:
git remote add origin https://github.com/financeirophoenixseg-stack/financeiro-familiar.git
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
