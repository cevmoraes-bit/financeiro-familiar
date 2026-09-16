import { supabase } from '@/lib/supabase';

export interface Category {
  id: number;
  user_id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string | null;
  color: string | null;
  created_at: string;
}

export const DEFAULT_CATEGORIES: Array<Pick<Category, 'name' | 'type' | 'icon' | 'color'>> = [
  { name: 'Alimentação', type: 'expense', icon: '🍽️', color: '#f97316' },
  { name: 'Transporte', type: 'expense', icon: '🚗', color: '#3b82f6' },
  { name: 'Combustível', type: 'expense', icon: '⛽', color: '#eab308' },
  { name: 'Moradia', type: 'expense', icon: '🏠', color: '#8b5cf6' },
  { name: 'Saúde', type: 'expense', icon: '💊', color: '#10b981' },
  { name: 'Lazer', type: 'expense', icon: '🎮', color: '#ec4899' },
  { name: 'Educação', type: 'expense', icon: '📚', color: '#6366f1' },
  { name: 'Compras', type: 'expense', icon: '🛒', color: '#f59e0b' },
  { name: 'Internet e Telefone', type: 'expense', icon: '📶', color: '#0ea5e9' },
  { name: 'Cartão de Crédito', type: 'expense', icon: '💳', color: '#dc2626' },
  { name: 'Outros', type: 'expense', icon: '📌', color: '#64748b' },
  { name: 'Salário', type: 'income', icon: '💰', color: '#10b981' },
  { name: 'Freelance', type: 'income', icon: '💻', color: '#3b82f6' },
  { name: 'Investimentos', type: 'income', icon: '📈', color: '#8b5cf6' },
  { name: 'Outros', type: 'income', icon: '📌', color: '#64748b' },
];

// Keyword -> category name, used to auto-classify imported bills/receipts.
// Matching is case-insensitive substring match against the extracted text.
export const CATEGORY_KEYWORDS: Array<{ match: RegExp; category: string; type: 'expense' | 'income' }> = [
  { match: /energia|eletrica|cemig|enel|light|copel|celesc/i, category: 'Moradia', type: 'expense' },
  { match: /condom[ií]nio|aluguel|imobiliaria|iptu/i, category: 'Moradia', type: 'expense' },
  { match: /agua|saneamento|sabesp|copasa|caesb/i, category: 'Moradia', type: 'expense' },
  { match: /internet|vivo|claro|tim|oi\s|net\svirtua|telefonia|banda\slarga/i, category: 'Internet e Telefone', type: 'expense' },
  { match: /supermercado|mercado|hortifruti|atacad[aã]o/i, category: 'Alimentação', type: 'expense' },
  { match: /restaurante|lanchonete|ifood|delivery|padaria/i, category: 'Alimentação', type: 'expense' },
  { match: /farmacia|drogaria|hospital|clinica|laborat[oó]rio|plano\sde\ssaude/i, category: 'Saúde', type: 'expense' },
  { match: /escola|faculdade|universidade|mensalidade\sescolar|curso/i, category: 'Educação', type: 'expense' },
  { match: /uber|99\s|estacionamento|pedagio/i, category: 'Transporte', type: 'expense' },
  { match: /combustivel|posto|gasolina|etanol|alcool|diesel|litros?\b/i, category: 'Combustível', type: 'expense' },
  { match: /fatura\scartao|cartao\sde\scredito|nubank|inter\scard|itaucard/i, category: 'Cartão de Crédito', type: 'expense' },
  { match: /cinema|streaming|netflix|spotify|academia/i, category: 'Lazer', type: 'expense' },
  { match: /salario|holerite|folha\sde\spagamento/i, category: 'Salário', type: 'income' },
  { match: /honorarios|freelance|prestacao\sde\sservico/i, category: 'Freelance', type: 'income' },
  { match: /dividendo|rendimento|investimento|juros/i, category: 'Investimentos', type: 'income' },
];

export function classifyCategory(text: string, type: 'expense' | 'income'): string {
  const normalized = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  const match = CATEGORY_KEYWORDS.find((k) => k.type === type && k.match.test(normalized));
  return match?.category || 'Outros';
}

export async function ensureDefaultCategories(userId: string): Promise<Category[]> {
  const { data: existing, error: fetchError } = await supabase
    .from('categories')
    .select('*')
    .order('type')
    .order('name');

  if (fetchError) throw fetchError;

  if (existing && existing.length > 0) {
    return existing as Category[];
  }

  const { data: inserted, error: insertError } = await supabase
    .from('categories')
    .insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId })))
    .select('*');

  if (insertError) throw insertError;
  return (inserted as Category[]) || [];
}
