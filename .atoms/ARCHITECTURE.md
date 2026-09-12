# Architecture Design

## System Overview
App de controle financeiro pessoal com frontend React responsivo e backend Atoms Cloud (PostgreSQL + Auth).

## Tech Stack
- Frontend: React + TypeScript + Vite + Tailwind CSS + Shadcn/ui
- Backend: Atoms Cloud (Auth, Database, API)
- Database: PostgreSQL via Atoms Cloud entities
- Auth: Atoms Cloud OIDC (web-sdk client.auth)

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| Auth | Login/logout via Atoms Cloud | contexts/AuthContext.tsx, lib/auth.ts |
| Dashboard | Resumo financeiro mensal | pages/Dashboard.tsx |
| Transactions | CRUD e listagem de transações | pages/Transactions.tsx |
| AddTransaction | Formulário rápido de registro | components/AddTransactionDialog.tsx |
| Layout | Navegação mobile-first | components/AppLayout.tsx |
| Landing | Página inicial para não-logados | pages/Index.tsx |

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend | Atoms Cloud | Auth + DB integrados, sem config extra |
| Tema | Dark mode fintech | Inspirado em Revolut/Wise, conforto visual |
| Navegação | Bottom nav fixo | Mobile-first, acesso rápido com polegar |
| Categorias | Pré-definidas no frontend | MVP simples, sem necessidade de CRUD extra |
| Registro rápido | Dialog com botão flutuante | Padrão mobile para ação principal |

## File Tree Plan
```
src/
├── App.tsx (rotas)
├── index.css (tema)
├── pages/
│   ├── Index.tsx (landing)
│   ├── Dashboard.tsx (dashboard)
│   └── Transactions.tsx (lista)
├── components/
│   ├── AppLayout.tsx (layout + nav)
│   └── AddTransactionDialog.tsx (formulário)
├── contexts/
│   └── AuthContext.tsx (auth state)
└── lib/
    ├── api.ts (web-sdk client)
    └── auth.ts (auth helpers)
```

## Implementation Guide
1. Usuário acessa / → vê landing page → clica "Entrar"
2. Auth via Atoms Cloud OIDC → redirect para /auth/callback
3. Após login, redirect para /dashboard
4. Dashboard mostra saldo, receitas, despesas, breakdown por categoria
5. Botão + flutuante abre dialog para registrar transação
6. /transactions mostra histórico completo com filtros