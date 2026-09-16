import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ParsedBill, ParsedFileResult } from './types';
import { extractFieldsFromText, extractItemsFromText } from './textExtract';
import { hasKnownColumns, mapRowsToBills } from './rows';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tif', 'tiff', 'heic', 'gif'];

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => ('str' in item ? (item as { str: string }).str : '')).join(' ') + '\n';
  }
  return text;
}

async function extractImageText(file: File): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('por');
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    return text;
  } finally {
    await worker.terminate();
  }
}

function parseOfx(text: string): ParsedBill[] {
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTTRN>|$)/gi) || [];

  return blocks
    .map((block): ParsedBill | null => {
      const amountMatch = block.match(/<TRNAMT>\s*(-?[\d.]+)/i);
      const dateMatch = block.match(/<DTPOSTED>\s*(\d{8})/i);
      const nameMatch = block.match(/<NAME>([^\n<]+)/i) || block.match(/<PAYEE>([^\n<]+)/i);
      const memoMatch = block.match(/<MEMO>([^\n<]+)/i);

      if (!amountMatch) return null;
      const amount = parseFloat(amountMatch[1]);
      if (!Number.isFinite(amount) || amount === 0) return null;

      const dateStr = dateMatch?.[1];
      const dueDate = dateStr ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}` : undefined;
      const name = (nameMatch?.[1] || memoMatch?.[1] || '').trim();
      const type: 'expense' | 'income' = amount < 0 ? 'expense' : 'income';

      const bill: ParsedBill = {
        amount: Math.abs(amount),
        dueDate,
        description: name || undefined,
        type,
        alreadyPaid: true,
      };
      if (type === 'expense') bill.beneficiary = name || undefined;
      else bill.payer = name || undefined;
      return bill;
    })
    .filter((b): b is ParsedBill => b !== null);
}

async function parseCsv(file: File): Promise<ParsedFileResult> {
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields || [];

  if (hasKnownColumns(headers)) {
    const bills = mapRowsToBills(parsed.data);
    if (bills.length > 0) return { bills, parseMethod: 'csv' };
  }

  const bill = extractFieldsFromText(text);
  return { bills: [bill], rawText: text, parseMethod: 'csv' };
}

async function parseXlsx(file: File): Promise<ParsedFileResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  if (hasKnownColumns(headers)) {
    const bills = mapRowsToBills(rows);
    if (bills.length > 0) return { bills, parseMethod: 'xlsx' };
  }

  const text = rows.map((r) => Object.values(r).join(' ')).join('\n');
  const bill = extractFieldsFromText(text);
  return { bills: [bill], rawText: text, parseMethod: 'xlsx' };
}

export async function parseFile(file: File): Promise<ParsedFileResult> {
  const ext = getExtension(file.name);
  const mime = file.type;

  try {
    if (ext === 'csv' || mime === 'text/csv') {
      return await parseCsv(file);
    }
    if (ext === 'xlsx' || ext === 'xls') {
      return await parseXlsx(file);
    }
    if (ext === 'ofx' || ext === 'qfx') {
      const text = await file.text();
      const bills = parseOfx(text);
      if (bills.length > 0) return { bills, rawText: text.slice(0, 5000), parseMethod: 'ofx' };
      return { bills: [{}], rawText: text.slice(0, 5000), parseMethod: 'ofx', warning: 'Nenhuma transação reconhecida no arquivo OFX.' };
    }
    if (ext === 'pdf' || mime === 'application/pdf') {
      const text = await extractPdfText(file);
      const bill = extractFieldsFromText(text);
      bill.items = extractItemsFromText(text);
      return { bills: [bill], rawText: text, parseMethod: 'pdf' };
    }
    if (mime.startsWith('image/') || IMAGE_EXTENSIONS.includes(ext)) {
      const text = await extractImageText(file);
      const bill = extractFieldsFromText(text);
      bill.items = extractItemsFromText(text);
      return { bills: [bill], rawText: text, parseMethod: 'ocr' };
    }
    if (ext === 'txt' || mime === 'text/plain') {
      const text = await file.text();
      return { bills: [extractFieldsFromText(text)], rawText: text, parseMethod: 'csv' };
    }
  } catch (err) {
    console.error('Erro ao interpretar arquivo:', err);
    return {
      bills: [{}],
      parseMethod: 'none',
      warning: 'Não foi possível ler o conteúdo automaticamente. O arquivo foi anexado; preencha os dados manualmente.',
    };
  }

  return {
    bills: [{}],
    parseMethod: 'none',
    warning: 'Formato não suportado para leitura automática. O arquivo foi anexado; preencha os dados manualmente.',
  };
}
