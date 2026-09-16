export interface ParsedBill {
  beneficiary?: string;
  payer?: string;
  dueDate?: string; // ISO yyyy-mm-dd
  amount?: number;
  description?: string;
  type?: 'expense' | 'income';
  alreadyPaid?: boolean;
}

export interface ParsedFileResult {
  bills: ParsedBill[];
  rawText?: string;
  parseMethod: 'csv' | 'xlsx' | 'ofx' | 'pdf' | 'ocr' | 'none';
  warning?: string;
}
