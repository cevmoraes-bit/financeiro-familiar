import { ParsedBill, ParsedItem } from './types';

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

const PAYER_LABELS = /(?:pagador|sacado|devedor|tomador|cliente)\s*[:\-]?\s*([^\n\r]{3,80})/i;

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

const ITEM_LINE_BLOCKLIST =
  /total|subtotal|troco|desconto|acrescimo|forma de pagamento|dinheiro|cartao|credito|debito|\bpix\b|cnpj|cpf|endereco|telefone|\bcupom\b|nfc-?e|chave de acesso|consumidor|obrigado|volte sempre|codigo|protocolo|autorizacao|tributos|\bibpt\b|\bicms\b|operacao|extrato|imposto|valor pago|valor total|\bnumero\b|\bdata\b|\bhora\b|\bcaixa\b|operador|\bloja\b|filial|qtde?\.?\s*itens|itens\s*:/;

function parseItemLine(line: string): ParsedItem | null {
  const trimmed = line.trim();
  if (trimmed.length < 4 || trimmed.length > 100) return null;

  const normalized = trimmed
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  if (ITEM_LINE_BLOCKLIST.test(normalized)) return null;

  const numberMatches = [...trimmed.matchAll(/\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}/g)];
  if (numberMatches.length === 0) return null;

  const last = numberMatches[numberMatches.length - 1];
  const totalPrice = parseBRCurrency(last[0]);
  if (totalPrice === undefined || totalPrice <= 0 || totalPrice > 50000) return null;

  // Only trust a quantity when it's unambiguously a "qty UN x" column (not a
  // package-size mention inside the product name, e.g. "ARROZ 5KG").
  let quantity: number | undefined;
  const qtyXMatch = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:un|und|unid|kg|lt|cx|pc|pct)\b\s*[x×]/i);
  if (qtyXMatch) {
    quantity = parseFloat(qtyXMatch[1].replace(',', '.'));
  }

  const cutIndex = qtyXMatch?.index ?? last.index ?? trimmed.length;
  let namePart = trimmed.slice(0, cutIndex).trim();
  namePart = namePart.replace(/^\d{1,6}\s*[-.]?\s*/, '');
  namePart = namePart.replace(/[-–—.:x×]+$/i, '').trim();
  namePart = namePart.replace(/\s{2,}/g, ' ');
  if (namePart.length < 3 || /^\d+$/.test(namePart)) return null;

  let unitPrice: number | undefined;
  if (numberMatches.length >= 2) {
    const candidate = parseBRCurrency(numberMatches[numberMatches.length - 2][0]);
    if (candidate !== undefined && quantity && Math.abs(candidate * quantity - totalPrice) < 0.05) {
      unitPrice = candidate;
    }
  }

  return { name: namePart, quantity, unitPrice, totalPrice };
}

const LITERS_LABELS = /(?:litros?|qtd\.?\s*litros?|volume)\s*[:\-]?\s*(\d+(?:[.,]\d{1,3})?)/i;

const PRICE_PER_LITER_LABELS =
  /(?:pre[çc]o\s*(?:por\s*)?\/?\s*(?:litro|l\b)|p\.?\s*unit[aá]rio|valor\s*\/?\s*(?:litro|l\b)|r\$\s*\/\s*l)\s*[:\-]?\s*(?:r\$\s*)?(\d+,\d{2,3})/i;

const FUEL_TYPE_LABELS = /gasolina\s*aditivada|gasolina\s*comum|gasolina|etanol|[aá]lcool|diesel\s*s-?10|diesel/i;

export function extractFuelFields(text: string): Pick<ParsedBill, 'liters' | 'pricePerLiter' | 'fuelType'> {
  const result: Pick<ParsedBill, 'liters' | 'pricePerLiter' | 'fuelType'> = {};

  const litersMatch = text.match(LITERS_LABELS);
  if (litersMatch) {
    const value = parseFloat(litersMatch[1].replace(',', '.'));
    if (Number.isFinite(value)) result.liters = value;
  }

  const priceMatch = text.match(PRICE_PER_LITER_LABELS);
  if (priceMatch) {
    const value = parseBRCurrency(priceMatch[1]);
    if (value !== undefined) result.pricePerLiter = value;
  }

  const fuelTypeMatch = text.match(FUEL_TYPE_LABELS);
  if (fuelTypeMatch) {
    result.fuelType = fuelTypeMatch[0]
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());
  }

  return result;
}

export function extractItemsFromText(text: string): ParsedItem[] {
  const lines = text.split(/\n+/);
  const items: ParsedItem[] = [];
  for (const line of lines) {
    const item = parseItemLine(line);
    if (item) items.push(item);
    if (items.length >= 40) break;
  }
  return items;
}
