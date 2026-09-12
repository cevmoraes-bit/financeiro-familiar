import { useState } from 'react';
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
import { client } from '@/lib/api';

const DEFAULT_CATEGORIES = {
  expense: [
    { name: 'Alimentação', icon: '🍽️', color: '#f97316' },
    { name: 'Transporte', icon: '🚗', color: '#3b82f6' },
    { name: 'Moradia', icon: '🏠', color: '#8b5cf6' },
    { name: 'Saúde', icon: '💊', color: '#10b981' },
    { name: 'Lazer', icon: '🎮', color: '#ec4899' },
    { name: 'Educação', icon: '📚', color: '#6366f1' },
    { name: 'Compras', icon: '🛒', color: '#f59e0b' },
    { name: 'Outros', icon: '📌', color: '#64748b' },
  ],
  income: [
    { name: 'Salário', icon: '💰', color: '#10b981' },
    { name: 'Freelance', icon: '💻', color: '#3b82f6' },
    { name: 'Investimentos', icon: '📈', color: '#8b5cf6' },
    { name: 'Outros', icon: '📌', color: '#64748b' },
  ],
};

interface AddTransactionDialogProps {
  onSuccess: () => void;
}

const AddTransactionDialog = ({ onSuccess }: AddTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const categories = DEFAULT_CATEGORIES[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !category || !date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    setLoading(true);
    try {
      await client.entities.transactions.create({
        data: {
          type,
          amount: numAmount,
          category,
          description: description || undefined,
          date,
        },
      });
      
      toast.success(type === 'expense' ? 'Despesa registrada!' : 'Receita registrada!');
      setOpen(false);
      resetForm();
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar transação');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setCategory('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setType('expense');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="lg" 
          className="fixed bottom-20 right-4 sm:right-8 z-50 rounded-full w-14 h-14 shadow-lg cursor-pointer"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova transação</DialogTitle>
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
                  <SelectItem key={cat.name} value={cat.name} className="cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="cursor-pointer"
            />
          </div>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full cursor-pointer" 
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar transação'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;