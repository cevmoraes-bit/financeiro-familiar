export interface TransactionItem {
  id: number;
  transaction_id: number;
  name: string;
  quantity: number | null;
  unit_price: number | null;
  total_price: number;
}

export interface Transaction {
  id: number;
  type: 'expense' | 'income';
  amount: number;
  category: string;
  category_id: number | null;
  description?: string | null;
  date: string;
  due_date?: string | null;
  beneficiary?: string | null;
  payer?: string | null;
  status: 'paid' | 'pending';
  source: 'manual' | 'import';
  attachment_url?: string | null;
  created_at: string;
}
