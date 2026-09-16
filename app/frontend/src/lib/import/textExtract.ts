import { ParsedBill } from './types';

export function parseBRCurrency(raw: string): number | undefined {
  const cleaned = raw.replace(/r\$/i, '').trim();
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : undefined;
}

export function parseBRDate(raw: string): string | undefined {
  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

const CURRENCY_LABELS =
  /(?:valor\s+(?:do\s+documento|cobrado|a\s+pagar|total|da\s+fatura|nominal)|total\s+a\s+pagar|valor)\s*[:\-]?\s*(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/i;

const DATE_LABELS =
  /(?:data\s+de\s+vencimento|vencimento|vence\s+em|data\s+limite)\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/i;

const BENEFICIARY_LABELS = /(?:benefici[aá]rio|cedente|favorecido|recebedor)\s*[:\-]?\s*([^\n\r]{3,80})/i;

const PAYER_LABELS = /(?:pagador|sacado|devedor|tomador)\s*[:\-]?\s*([^\n\r]{3,80})/i;

const ANY_CURRENCY = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/g;
const ANY_DATE = /(\d{2}\/\d{2}\/\d{4})/g;

function cleanCapturedName(raw: string): string {
  return raw
    .split(/\s{2,}|\t|\|/)[0]
    .replace(/[:\-–]+$/, '')
    .trim();
}

export function extractFieldsFromText(text: string): ParsedBill {
  const result: ParsedBill = {};

  const currencyLabelMatch = text.match(CURRENCY_LABELS);
  if (currencyLabelMatch) {
    result.amount = parseBRCurrency(currencyLabelMatch[1]);
  } else {
    const all = [...text.matchAll(ANY_CURRENCY)]
      .map((m) => parseBRCurrency(m[1]))
      .filter((v): v is number => v !== undefined);
    if (all.length > 0) {
      result.amount = Math.max(...all);
    }
  }

  const dateLabelMatch = text.match(DATE_LABELS);
  if (dateLabelMatch) {
    result.dueDate = parseBRDate(dateLabelMatch[1]);
  } else {
    const firstDate = text.match(ANY_DATE);
    if (firstDate) {
      result.dueDate = parseBRDate(firstDate[0]);
    }
  }

  const beneficiaryMatch = text.match(BENEFICIARY_LABELS);
  if (beneficiaryMatch) {
    result.beneficiary = cleanCapturedName(beneficiaryMatch[1]);
  }

  const payerMatch = text.match(PAYER_LABELS);
  if (payerMatch) {
    result.payer = cleanCapturedName(payerMatch[1]);
  }

  return result;
}
