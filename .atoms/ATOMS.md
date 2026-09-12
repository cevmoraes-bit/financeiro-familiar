# Project Context

## Project Overview
FinControl - App de controle financeiro pessoal, mobile-first, para registro imediato de despesas e receitas. Funciona no celular e computador com dados sincronizados via backend.

## Key Decisions
| Date | Decision | By | Rationale |
|------|----------|-----|-----------|
| 2026-07-22 | Dark mode como padrão | Alex | Inspirado em apps fintech (Revolut, Wise), conforto visual |
| 2026-07-22 | Bottom navigation | Alex | Mobile-first, acesso rápido com polegar |
| 2026-07-22 | Categorias pré-definidas | Alex | MVP simples, sem complexidade extra |
| 2026-07-22 | Botão flutuante + | Alex | Padrão mobile para ação principal rápida |

## Constraints
- Design: Dark mode fintech, paleta azul (#2563EB primary) + laranja (#F97316 accent)
- Tipografia: Inter (Google Fonts), tabular-nums para valores
- Layout: Mobile-first, max-w-4xl para desktop, bottom nav fixo
- Responsivo: 375px mobile, 768px tablet, 1024px+ desktop
- Categorias de despesa: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Compras, Outros
- Categorias de receita: Salário, Freelance, Investimentos, Outros