import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UploadCloud, FileText, AlertTriangle, ArrowLeft, Camera, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { parseFile } from '@/lib/import/parsers';
import { ParsedBill } from '@/lib/import/types';
import { classifyCategory } from '@/lib/categories';
import { uploadReceipt } from '@/lib/receipts';

type Stage = 'upload' | 'review-single' | 'review-multi';
type TxType = 'expense' | 'income';
type TxStatus = 'paid' | 'pending';

interface ItemRow {
  id: string;
  name: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
}

interface SingleForm {
  type: TxType;
  status: TxStatus;
  beneficiary: string;
  payer: string;
  dueDate: string;
  amount: string;
  description: string;
  categoryName: string;
  items: ItemRow[];
}

let itemIdCounter = 0;
const newItemId = () => `item-${Date.now()}-${itemIdCounter++}`;

const emptyItemRow = (): ItemRow => ({ id: newItemId(), name: '', quantity: '', unitPrice: '', totalPrice: '' });

interface MultiRow {
  id: string;
  include: boolean;
  type: TxType;
  status: TxStatus;
  beneficiary: string;
  payer: string;
  dueDate: string;
  amount: string;
  description: string;
  categoryName: string;
}

const today = () => new Date().toISOString().split('T')[0];

const buildSingleForm = (bill: ParsedBill, extraText: string): SingleForm => {
  const type: TxType = bill.type || 'expense';
  const status: TxStatus = bill.alreadyPaid ? 'paid' : 'pending';
  const categoryName = classifyCategory(
    `${bill.beneficiary || ''} ${bill.payer || ''} ${bill.description || ''} ${extraText}`,
    type
  );
  return {
    type,
    status,
    beneficiary: bill.beneficiary || '',
    payer: bill.payer || '',
    dueDate: bill.dueDate || today(),
    amount: bill.amount ? String(bill.amount) : '',
    description: bill.description || '',
    categoryName,
    items: (bill.items || []).map((item) => ({
      id: newItemId(),
      name: item.name,
      quantity: item.quantity !== undefined ? String(item.quantity) : '',
      unitPrice: item.unitPrice !== undefined ? String(item.unitPrice) : '',
      totalPrice: String(item.totalPrice),
    })),
  };
};

const buildMultiRow = (bill: ParsedBill, index: number): MultiRow => {
  const type: TxType = bill.type || 'expense';
  const status: TxStatus = bill.alreadyPaid ? 'paid' : 'pending';
  const categoryName = classifyCategory(`${bill.beneficiary || ''} ${bill.payer || ''} ${bill.description || ''}`, type);
  return {
    id: `row-${index}`,
    include: true,
    type,
    status,
    beneficiary: bill.beneficiary || '',
    payer: bill.payer || '',
    dueDate: bill.dueDate || today(),
    amount: bill.amount ? String(bill.amount) : '',
    description: bill.description || '',
    categoryName,
  };
};

const Import = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { expenseCategories, incomeCategories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('upload');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [form, setForm] = useState<SingleForm | null>(null);
  const [multiRows, setMultiRows] = useState<MultiRow[]>([]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center dark">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 dark p-6">
        <p className="text-muted-foreground">Faça login para importar contas e comprovantes</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium cursor-pointer hover:opacity-90 transition-opacity"
        >
          Entrar
        </button>
      </div>
    );
  }

  const resetAll = () => {
    setStage('upload');
    setFileName('');
    setAttachmentPath(null);
    setWarning(null);
    setForm(null);
    setMultiRows([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setFileName(file.name);
    setWarning(null);
    try {
      const [parseResult, path] = await Promise.all([
        parseFile(file),
        uploadReceipt(user.id, file).catch((err) => {
          console.error('Erro ao anexar arquivo:', err);
          return null;
        }),
      ]);

      setAttachmentPath(path);
      if (parseResult.warning) setWarning(parseResult.warning);

      if (parseResult.bills.length > 1) {
        setMultiRows(parseResult.bills.map((b, i) => buildMultiRow(b, i)));
        setStage('review-multi');
      } else {
        const bill = parseResult.bills[0] || {};
        setForm(buildSingleForm(bill, (parseResult.rawText || '').slice(0, 300)));
        setStage('review-single');
      }
    } catch (err) {
      console.error('Erro ao processar arquivo:', err);
      toast.error('Não foi possível processar o arquivo');
      resetAll();
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const categoriesFor = (type: TxType) => (type === 'expense' ? expenseCategories : incomeCategories);

  const handleSaveSingle = async () => {
    if (!form) return;
    const amount = parseFloat(form.amount.replace(',', '.'));
    if (!amount || amount <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    if (!form.dueDate) {
      toast.error('Informe a data de vencimento');
      return;
    }
    const validItems = form.items.filter((it) => it.name.trim() && parseFloat(it.totalPrice.replace(',', '.')) > 0);
    if (form.items.some((it) => it.name.trim() && !(parseFloat(it.totalPrice.replace(',', '.')) > 0))) {
      toast.error('Informe o valor de cada item ou remova a linha vazia');
      return;
    }

    setBusy(true);
    try {
      const match = categoriesFor(form.type).find((c) => c.name === form.categoryName);
      const { data: inserted, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: form.type,
          amount,
          category: form.categoryName || 'Outros',
          category_id: match?.id ?? null,
          description: form.description || null,
          date: form.dueDate,
          due_date: form.dueDate,
          beneficiary: form.beneficiary || null,
          payer: form.payer || null,
          status: form.status,
          source: 'import',
          attachment_url: attachmentPath,
        })
        .select('id')
        .single();
      if (error) throw error;

      if (validItems.length > 0) {
        const { error: itemsError } = await supabase.from('transaction_items').insert(
          validItems.map((it) => ({
            user_id: user.id,
            transaction_id: inserted.id,
            name: it.name.trim(),
            quantity: it.quantity ? parseFloat(it.quantity.replace(',', '.')) : null,
            unit_price: it.unitPrice ? parseFloat(it.unitPrice.replace(',', '.')) : null,
            total_price: parseFloat(it.totalPrice.replace(',', '.')),
          }))
        );
        if (itemsError) throw itemsError;
      }

      toast.success('Transação importada com sucesso!');
      resetAll();
      navigate('/transactions');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar transação');
    } finally {
      setBusy(false);
    }
  };

  const updateItem = (id: string, patch: Partial<ItemRow>) => {
    setForm((f) => (f ? { ...f, items: f.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) } : f));
  };

  const addItem = () => {
    setForm((f) => (f ? { ...f, items: [...f.items, emptyItemRow()] } : f));
  };

  const removeItem = (id: string) => {
    setForm((f) => (f ? { ...f, items: f.items.filter((it) => it.id !== id) } : f));
  };

  const handleSaveMulti = async () => {
    const selected = multiRows.filter((r) => r.include);
    if (selected.length === 0) {
      toast.error('Selecione ao menos um item para importar');
      return;
    }
    const invalid = selected.some((r) => !r.amount || parseFloat(r.amount.replace(',', '.')) <= 0 || !r.dueDate);
    if (invalid) {
      toast.error('Verifique o valor e a data de todos os itens selecionados');
      return;
    }
    setBusy(true);
    try {
      const rowsToInsert = selected.map((r) => {
        const match = categoriesFor(r.type).find((c) => c.name === r.categoryName);
        return {
          user_id: user.id,
          type: r.type,
          amount: parseFloat(r.amount.replace(',', '.')),
          category: r.categoryName || 'Outros',
          category_id: match?.id ?? null,
          description: r.description || null,
          date: r.dueDate,
          due_date: r.dueDate,
          beneficiary: r.beneficiary || null,
          payer: r.payer || null,
          status: r.status,
          source: 'import',
          attachment_url: attachmentPath,
        };
      });
      const { error } = await supabase.from('transactions').insert(rowsToInsert);
      if (error) throw error;
      toast.success(`${rowsToInsert.length} transações importadas!`);
      resetAll();
      navigate('/transactions');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar transações');
    } finally {
      setBusy(false);
    }
  };

  const updateRow = (id: string, patch: Partial<MultiRow>) => {
    setMultiRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {stage !== 'upload' && (
            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={resetAll}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <h1 className="text-2xl font-bold text-foreground">Importar</h1>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Importe contas a pagar, contas a receber ou comprovantes de pagamento (qualquer tipo de arquivo: PDF, imagem,
          planilha, CSV ou OFX). Os dados de beneficiário, pagador, vencimento e valor são identificados
          automaticamente sempre que possível.
        </p>

        {stage === 'upload' && (
          <div className="space-y-3">
            <Card
              className="p-6 border-2 border-primary/40 hover:border-primary transition-colors cursor-pointer"
              onClick={() => cameraInputRef.current?.click()}
            >
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Camera className="w-7 h-7 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Tirar foto agora</p>
                  <p className="text-xs text-muted-foreground">
                    Nota do abastecimento, cupom do mercado, boleto — direto da câmera do celular
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className={`p-8 border-2 border-dashed transition-colors cursor-pointer ${
                dragOver ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <UploadCloud className="w-7 h-7 text-primary" />
                </div>
                {busy ? (
                  <p className="text-sm text-muted-foreground">Processando "{fileName}"...</p>
                ) : (
                  <>
                    <p className="font-medium text-foreground">Ou arraste um arquivo aqui / toque para selecionar</p>
                    <p className="text-xs text-muted-foreground">
                      Foto da galeria, PDF, extrato bancário (OFX), planilha (XLSX) ou CSV — qualquer extensão
                    </p>
                  </>
                )}
              </div>
            </Card>
          </div>
        )}

        {warning && stage !== 'upload' && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{warning}</span>
          </div>
        )}

        {stage === 'review-single' && form && (
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span className="truncate">{fileName}</span>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant={form.type === 'expense' ? 'default' : 'outline'}
                className="flex-1 cursor-pointer"
                onClick={() => setForm({ ...form, type: 'expense', categoryName: classifyCategory(form.description + ' ' + form.beneficiary, 'expense') })}
              >
                Conta a pagar (despesa)
              </Button>
              <Button
                type="button"
                variant={form.type === 'income' ? 'default' : 'outline'}
                className="flex-1 cursor-pointer"
                onClick={() => setForm({ ...form, type: 'income', categoryName: classifyCategory(form.description + ' ' + form.payer, 'income') })}
              >
                Conta a receber (receita)
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Beneficiário (quem recebe)</Label>
              <Input value={form.beneficiary} onChange={(e) => setForm({ ...form, beneficiary: e.target.value })} placeholder="Ex: Cia de Energia" />
            </div>

            <div className="space-y-2">
              <Label>Pagador / Cliente</Label>
              <Input value={form.payer} onChange={(e) => setForm({ ...form, payer: e.target.value })} placeholder="Ex: Seu nome" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria (classificada automaticamente)</Label>
              <Select value={form.categoryName} onValueChange={(v) => setForm({ ...form, categoryName: v })}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesFor(form.type).map((c) => (
                    <SelectItem key={c.id} value={c.name} className="cursor-pointer">
                      <span className="flex items-center gap-2">
                        <span>{c.icon}</span>
                        <span>{c.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opcional" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens da nota (opcional)</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 cursor-pointer" onClick={addItem}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Item
                </Button>
              </div>
              {form.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum item identificado. Útil para saber onde o dinheiro do mercado está indo — adicione manualmente se quiser.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-1.5">
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        placeholder="Produto"
                        className="flex-1"
                      />
                      <Input
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
                        placeholder="Qtd"
                        className="w-16"
                      />
                      <Input
                        value={item.totalPrice}
                        onChange={(e) => updateItem(item.id, { totalPrice: e.target.value })}
                        placeholder="Valor"
                        className="w-24"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 cursor-pointer text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Situação</Label>
              <Select value={form.status} onValueChange={(v: TxStatus) => setForm({ ...form, status: v })}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending" className="cursor-pointer">A pagar/receber (pendente)</SelectItem>
                  <SelectItem value="paid" className="cursor-pointer">Já paga/recebida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full cursor-pointer" disabled={busy} onClick={handleSaveSingle}>
              {busy ? 'Salvando...' : 'Salvar em Transações'}
            </Button>
          </Card>
        )}

        {stage === 'review-multi' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {multiRows.length} itens encontrados. Revise, ajuste a categoria se necessário e escolha quais deseja
              importar.
            </p>
            {multiRows.map((row) => (
              <Card key={row.id} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={row.include}
                    onCheckedChange={(v) => updateRow(row.id, { include: !!v })}
                    className="mt-1 cursor-pointer"
                  />
                  <div className="flex-1 space-y-3 min-w-0">
                    <Input
                      value={row.description}
                      onChange={(e) => updateRow(row.id, { description: e.target.value })}
                      placeholder="Descrição"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" value={row.dueDate} onChange={(e) => updateRow(row.id, { dueDate: e.target.value })} />
                      <Input
                        type="number"
                        step="0.01"
                        value={row.amount}
                        onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                        placeholder="Valor"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={row.type} onValueChange={(v: TxType) => updateRow(row.id, { type: v, categoryName: classifyCategory(row.description, v) })}>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="expense" className="cursor-pointer">Despesa</SelectItem>
                          <SelectItem value="income" className="cursor-pointer">Receita</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={row.categoryName} onValueChange={(v) => updateRow(row.id, { categoryName: v })}>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriesFor(row.type).map((c) => (
                            <SelectItem key={c.id} value={c.name} className="cursor-pointer">
                              {c.icon} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Select value={row.status} onValueChange={(v: TxStatus) => updateRow(row.id, { status: v })}>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending" className="cursor-pointer">A pagar/receber (pendente)</SelectItem>
                        <SelectItem value="paid" className="cursor-pointer">Já paga/recebida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            ))}
            <Button className="w-full cursor-pointer" disabled={busy} onClick={handleSaveMulti}>
              {busy ? 'Importando...' : `Importar ${multiRows.filter((r) => r.include).length} selecionados`}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Import;
