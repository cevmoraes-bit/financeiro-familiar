import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import { Transaction } from '@/lib/transactions';

interface AddTransactionDialogProps {
  onSuccess: () => void;
  transaction?: Transaction;
  trigger?: ReactNode;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const AddTransactionDialog = ({ onSuccess, transaction, trigger }: AddTransactionDialogProps) => {
  const { user } = useAuth();
  const { expenseCategories, incomeCategories } = useCategories();
  const isEdit = !!transaction;
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'expense' | 'income'>(transaction?.type || 'expense');
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '');
  const [category, setCategory] = useState(transaction?.category || '');
  const [description, setDescription] = useState(transaction?.description || '');
  const [date, setDate] = useState(transaction?.date || todayStr());
  const [status, setStatus] = useState<'paid' | 'pending'>(transaction?.status || 'paid');
  const [dueDate, setDueDate] = useState(transaction?.due_date || transaction?.date || todayStr());
  const [beneficiary, setBeneficiary] = useState(transaction?.beneficiary || '');
  const [payer, setPayer] = useState(transaction?.payer || '');
  const [loading, setLoading] = useState(false);

  const categories = type === 'expense' ? expenseCategories : incomeCategories;

  const resetForm = () => {
    if (isEdit) return;
    setAmount('');
    setCategory('');
    setDescription('');
    setDate(todayStr());
    setDueDate(todayStr());
    setStatus('paid');
    setBeneficiary('');
    setPayer('');
    setType('expense');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !category) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    const effectiveDate = status === 'pending' ? dueDate : date;
    if (!effectiveDate) {
      toast.error('Informe a data');
      return;
    }

    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    const match = categories.find((c) => c.name === category);

    setLoading(true);
    try {
      const payload = {
        type,
        amount: numAmount,
        category,
        category_id: match?.id ?? null,
        description: description || null,
        date: effectiveDate,
        due_date: dueDate || effectiveDate,
        status,
        beneficiary: beneficiary || null,
        payer: payer || null,
      };

      if (isEdit && transaction) {
        const { error } = await supabase.from('transactions').update(payload).eq('id', transaction.id);
        if (error) throw error;
        toast.success('Transação atualizada!');
      } else {
        const { error } = await supabase.from('transactions').insert({
          ...payload,
          user_id: user.id,
          source: 'manual',
        });
        if (error) throw error;
        toast.success(type === 'expense' ? 'Despesa registrada!' : 'Receita registrada!');
      }

      setOpen(false);
      resetForm();
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar transação';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="lg"
            className="fixed bottom-20 right-4 sm:right-8 z-50 rounded-full w-14 h-14 shadow-lg cursor-pointer"
          >
            <Plus className="w-6 h-6" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar transação' : 'Nova transação'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === 'expense' ? 'default' : 'outline'}
              className="flex-1 cursor-pointer"
              onClick={() => { setType('expense'); setCategory(''); }}
            >
              Despesa
            </Button>
            <Button
              type="button"
              variant={type === 'income' ? 'default' : 'outline'}
              className="flex-1 cursor-pointer"
              onClick={() => { setType('income'); setCategory(''); }}
            >
              Receita
            </Button>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-2xl font-semibold h-14"
              autoFocus
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" className="cursor-pointer">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name} className="cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Situação</Label>
            <Select value={status} onValueChange={(v: 'paid' | 'pending') => setStatus(v)}>
              <SelectTrigger id="status" className="cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid" className="cursor-pointer">
                  {type === 'expense' ? 'Já paga' : 'Já recebida'}
                </SelectItem>
                <SelectItem value="pending" className="cursor-pointer">
                  {type === 'expense' ? 'A pagar (pendente)' : 'A receber (pendente)'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date / Due date */}
          {status === 'paid' ? (
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="cursor-pointer" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="dueDate">Vencimento</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="cursor-pointer" />
            </div>
          )}

          {/* Beneficiary / Payer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="beneficiary">Beneficiário</Label>
              <Input id="beneficiary" placeholder="Opcional" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payer">Pagador</Label>
              <Input id="payer" placeholder="Opcional" value={payer} onChange={(e) => setPayer(e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              placeholder="Ex: Almoço no restaurante"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full cursor-pointer"
            disabled={loading}
          >
            {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar transação'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;
