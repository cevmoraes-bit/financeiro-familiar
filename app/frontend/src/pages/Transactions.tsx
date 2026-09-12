import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TrendingUp, TrendingDown, Search, Trash2, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { client } from '@/lib/api';

interface Transaction {
  id: number;
  type: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  created_at: string;
}

const Transactions = () => {
  const { user, loading: authLoading, login } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoadingData(true);
      const response = await client.entities.transactions.query({
        query: {},
        sort: '-date',
        limit: 500,
      });
      setTransactions(response?.data?.items || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, fetchTransactions]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await client.entities.transactions.delete({ id: String(deleteId) });
      toast.success('Transação excluída');
      setDeleteId(null);
      fetchTransactions();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center dark">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 dark p-6">
        <p className="text-muted-foreground">Faça login para ver suas transações</p>
        <button 
          onClick={login}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium cursor-pointer hover:opacity-90 transition-opacity"
        >
          Entrar
        </button>
      </div>
    );
  }

  // Get unique months from transactions
  const months = [...new Set(transactions.map((t) => t.date.substring(0, 7)))].sort().reverse();

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = searchTerm === '' || 
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesMonth = filterMonth === 'all' || t.date.startsWith(filterMonth);
    return matchesSearch && matchesType && matchesMonth;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Transações</h1>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por categoria ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">Todos</SelectItem>
                <SelectItem value="expense" className="cursor-pointer">Despesas</SelectItem>
                <SelectItem value="income" className="cursor-pointer">Receitas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="flex-1 cursor-pointer">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">Todos os meses</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m} value={m} className="cursor-pointer capitalize">
                    {getMonthLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transaction List */}
        {loadingData ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              {transactions.length === 0
                ? 'Nenhuma transação registrada ainda'
                : 'Nenhuma transação encontrada com esses filtros'}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${
                      t.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                    }`}>
                      {t.type === 'income' ? (
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{t.category}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.description || formatDate(t.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        t.type === 'income' ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(t.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Summary footer */}
        {filteredTransactions.length > 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.length} transação{filteredTransactions.length !== 1 ? 'ões' : ''} encontrada{filteredTransactions.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      <AddTransactionDialog onSuccess={fetchTransactions} />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Transactions;