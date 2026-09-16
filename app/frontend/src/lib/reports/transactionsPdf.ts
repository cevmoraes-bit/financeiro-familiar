import type { Transaction } from '@/lib/transactions';

interface ExportOptions {
  title?: string;
  periodLabel?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr: string) => new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');

export async function exportTransactionsPdf(transactions: Transaction[], options: ExportOptions = {}) {
  // Loaded on demand: jsPDF pulls in html2canvas/dompurify it doesn't need
  // for our text+table usage, so keep it out of the main bundle.
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF();
  const title = options.title || 'Relatório de Transações';
  const generatedAt = new Date().toLocaleString('pt-BR');

  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text(title, 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(110);
  let headerY = 25;
  if (options.periodLabel) {
    doc.text(options.periodLabel, 14, headerY);
    headerY += 5;
  }
  doc.text(`Gerado em ${generatedAt}`, 14, headerY);

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const rows = sorted.map((t) => [
    formatDate(t.date),
    t.category,
    t.beneficiary || t.payer || t.description || '-',
    t.type === 'income' ? 'Receita' : 'Despesa',
    t.status === 'paid' ? 'Paga' : 'Pendente',
    (t.type === 'income' ? '+' : '-') + formatCurrency(t.amount),
  ]);

  autoTable(doc, {
    startY: headerY + 6,
    head: [['Data', 'Categoria', 'Descrição', 'Tipo', 'Situação', 'Valor']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: { 5: { halign: 'right' } },
  });

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text(`Total de receitas: ${formatCurrency(totalIncome)}`, 14, finalY);
  doc.setTextColor(239, 68, 68);
  doc.text(`Total de despesas: ${formatCurrency(totalExpense)}`, 14, finalY + 6);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(`Saldo: ${formatCurrency(balance)}`, 14, finalY + 13);
  doc.setFont('helvetica', 'normal');

  const filename = `relatorio-transacoes-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
