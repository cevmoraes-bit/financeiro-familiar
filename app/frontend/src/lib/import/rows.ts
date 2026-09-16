import { ParsedBill } from './types';
import { parseBRCurrency, parseBRDate } from './textExtract';

const FIELD_ALIASES: Record<keyof Pick<ParsedBill, 'beneficiary' | 'payer' | 'dueDate' | 'amount' | 'description'>, string[]> = {
  beneficiary: ['beneficiario', 'favorecido', 'credor', 'fornecedor', 'recebedor', 'cedente', 'quemreceber'],
  payer: ['pagador', 'sacado', 'cliente', 'devedor', 'quempaga'],
  dueDate: ['vencimento', 'datavencimento', 'dtvencimento', 'duedate', 'data'],
  amount: ['valor', 'valoradocumento', 'valortotal', 'valoradpagar', 'amount', 'valordodocumento', 'valorcobrado'],
  description: ['descricao', 'historico', 'memo', 'observacao', 'obs'],
};

function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function buildHeaderMap(headers: string[]): Partial<Record<keyof typeof FIELD_ALIASES, string>> {
  const normalizedHeaders = headers.map((h) => ({ original: h, normalized: normalizeHeader(h) }));
  const map: Partial<Record<keyof typeof FIELD_ALIASES, string>> = {};
  (Object.keys(FIELD_ALIASES) as Array<keyof typeof FIELD_ALIASES>).forEach((field) => {
    const aliases = FIELD_ALIASES[field];
    const found = normalizedHeaders.find((h) => aliases.includes(h.normalized));
    if (found) map[field] = found.original;
  });
  return map;
}

export function hasKnownColumns(headers: string[]): boolean {
  const map = buildHeaderMap(headers);
  return !!(map.amount && (map.dueDate || map.beneficiary));
}

function excelSerialToIso(serial: number): string | undefined {
  if (!Number.isFinite(serial) || serial <= 0) return undefined;
  const utcMs = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(utcMs);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().split('T')[0];
}

function parseAnyDate(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return excelSerialToIso(value);
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) return parseBRDate(str);
  return undefined;
}

function parseAnyAmount(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return value;
  const str = String(value).trim();
  if (/,\d{2}$/.test(str)) return parseBRCurrency(str);
  const value2 = parseFloat(str.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(value2) ? value2 : undefined;
}

export function mapRowsToBills(rows: Record<string, unknown>[]): ParsedBill[] {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const map = buildHeaderMap(headers);

  return rows
    .map((row) => {
      const bill: ParsedBill = {};
      if (map.beneficiary) bill.beneficiary = String(row[map.beneficiary] ?? '').trim() || undefined;
      if (map.payer) bill.payer = String(row[map.payer] ?? '').trim() || undefined;
      if (map.dueDate) bill.dueDate = parseAnyDate(row[map.dueDate]);
      if (map.amount) bill.amount = parseAnyAmount(row[map.amount]);
      if (map.description) bill.description = String(row[map.description] ?? '').trim() || undefined;
      return bill;
    })
    .filter((b) => b.amount !== undefined && b.amount > 0);
}
