import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { TrendingUp, TrendingDown, Search, Trash2, Filter, Pencil, CheckCircle2, ChevronDown, ChevronUp, ShoppingCart, Fuel } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Transaction, TransactionItem } from '@/lib/transactions';
import { useVehicles } from '@/hooks/useVehicles';

const Transactions = () => {
  const { user, loading: authLoading } = useAuth();
  const { vehicles } = useVehicles();
  const vehicleName = (id?: number | null) => vehicles.find((v) => v.id === id)?.name;
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [itemsByTransaction, setItemsByTransaction] = useState<Record<number, TransactionItem[]>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(500);

      if (error) throw error;
      const list = (data as Transaction[]) || [];
      setTransactions(list);

      if (list.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('transaction_items')
          .select('*')
          .in('transaction_id', list.map((t) => t.id));
        if (itemsError) throw itemsError;
        const grouped: Record<number, TransactionItem[]> = {};
        (items as TransactionItem[] | null)?.forEach((item) => {
          (grouped[item.transaction_id] ||= []).push(item);
        });
        setItemsByTransaction(grouped);
      } else {
        setItemsByTransaction({});
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const handleDeleteItem = async (itemId: number, transactionId: number) => {
    try {
      const { error } = await supabase.from('transaction_items').delete().eq('id', itemId);
      if (error) throw error;
      setItemsByTransaction((prev) => ({
        ...prev,
        [transactionId]: (prev[transactionId] || []).filter((it) => it.id !== itemId),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover item';
      toast.error(message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, fetchTransactions]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', deleteId);
      if (error) throw error;
      toast.success('Transação excluída');
      setDeleteId(null);
      fetchTransactions();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir';
      toast.error(message);
    }
  };

  const handleMarkPaid = async (t: Transaction) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'paid', date: new Date().toISOString().split('T')[0] })
        .eq('id', t.id);
      if (error) throw error;
      toast.success(t.type === 'expense' ? 'Marcada como paga' : 'Marcada como recebida');
      fetchTransactions();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar';
      toast.error(message);
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
          onClick={() => navigate('/login')}
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
      (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.beneficiary || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.payer || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesMonth = filterMonth === 'all' || t.date.startsWith(filterMonth);
    return matchesSearch && matchesType && matchesStatus && matchesMonth;
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

  const isOverdue = (t: Transaction) =>
    t.status === 'pending' && !!t.due_date && t.due_date < new Date().toISOString().split('T')[0];

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Transações</h1>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por categoria, beneficiário, pagador..."
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="flex-1 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">Todas situações</SelectItem>
                <SelectItem value="paid" className="cursor-pointer">Pagas/recebidas</SelectItem>
                <SelectItem value="pending" className="cursor-pointer">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="cursor-pointer">
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
                <div className="flex items-center justify-between gap-2">
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">{t.category}</p>
                        {t.status === 'pending' ? (
                          <Badge variant={isOverdue(t) ? 'destructive' : 'outline'} className="text-[10px] px-1.5 py-0">
                            {isOverdue(t) ? 'Vencida' : 'Pendente'}
                          </Badge>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {t.type === 'expense' ? 'Paga' : 'Recebida'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.vehicle_id ? (
                          <span className="inline-flex items-center gap-1">
                            <Fuel className="w-3 h-3" />
                            {vehicleName(t.vehicle_id) || 'Veículo'}
                            {t.liters ? ` · ${t.liters}L` : ''}
                          </span>
                        ) : (
                          t.beneficiary || t.payer || t.description || formatDate(t.date)
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="text-right mr-1">
                      <p className={`text-sm font-semibold ${
                        t.type === 'income' ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.status === 'pending' && t.due_date
                          ? `vence ${formatDate(t.due_date)}`
                          : `pago em ${formatDate(t.date)}`}
                      </p>
                    </div>
                    {t.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-emerald-500"
                        title="Marcar como paga/recebida"
                        onClick={() => handleMarkPaid(t)}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                    <AddTransactionDialog
                      transaction={t}
                      onSuccess={fetchTransactions}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      }
                    />
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

                {itemsByTransaction[t.id]?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <button
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      {itemsByTransaction[t.id].length} {itemsByTransaction[t.id].length === 1 ? 'item' : 'itens'}
                      {expandedId === t.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {expandedId === t.id && (
                      <div className="mt-2 space-y-1.5">
                        {itemsByTransaction[t.id].map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-foreground truncate flex-1">
                              {item.name}
                              {item.quantity ? ` (${item.quantity}x)` : ''}
                            </span>
                            <span className="text-muted-foreground flex-shrink-0">{formatCurrency(item.total_price)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 cursor-pointer text-muted-foreground hover:text-destructive flex-shrink-0"
                              onClick={() => handleDeleteItem(item.id, t.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
