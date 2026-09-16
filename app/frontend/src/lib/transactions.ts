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
