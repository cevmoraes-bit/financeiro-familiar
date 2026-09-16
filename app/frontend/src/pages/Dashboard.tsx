import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CalendarClock,
  CheckCircle2,
  ShoppingCart,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Transaction } from '@/lib/transactions';

interface CategorySummary {
  name: string;
  total: number;
  percentage: number;
  color: string;
}

interface ProductSummary {
  name: string;
  total: number;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingBills, setPendingBills] = useState<Transaction[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSummary[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];

      const [paidRes, pendingRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('status', 'paid')
          .gte('date', startOfMonth)
          .order('date', { ascending: false })
          .limit(500),
        supabase
          .from('transactions')
          .select('*')
          .eq('status', 'pending')
          .order('due_date', { ascending: true })
          .limit(20),
      ]);

      if (paidRes.error) throw paidRes.error;
      if (pendingRes.error) throw pendingRes.error;

      const paidTransactions = (paidRes.data as Transaction[]) || [];
      setTransactions(paidTransactions);
      setPendingBills((pendingRes.data as Transaction[]) || []);

      if (paidTransactions.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('transaction_items')
          .select('name, total_price')
          .in(
            'transaction_id',
            paidTransactions.map((t) => t.id)
          );
        if (itemsError) throw itemsError;
        const grouped: Record<string, number> = {};
        (items || []).forEach((it) => {
          grouped[it.name] = (grouped[it.name] || 0) + it.total_price;
        });
        const products = Object.entries(grouped)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 6);
        setTopProducts(products);
      } else {
        setTopProducts([]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      return;
    }
    if (user) {
      fetchData();
    }
  }, [user, authLoading, fetchData]);

  const handleMarkPaid = async (t: Transaction) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'paid', date: new Date().toISOString().split('T')[0] })
        .eq('id', t.id);
      if (error) throw error;
      toast.success(t.type === 'expense' ? 'Marcada como paga' : 'Marcada como recebida');
      fetchData();
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
        <p className="text-muted-foreground">Faça login para acessar o dashboard</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium cursor-pointer hover:opacity-90 transition-opacity"
        >
          Entrar
        </button>
      </div>
    );
  }

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Category breakdown for expenses
  const expensesByCategory: CategorySummary[] = (() => {
    const expenses = transactions.filter((t) => t.type === 'expense');
    const grouped: Record<string, number> = {};
    expenses.forEach((t) => {
      grouped[t.category] = (grouped[t.category] || 0) + t.amount;
    });
    const total = totalExpense || 1;
    const palette = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#6366f1', '#f59e0b', '#dc2626', '#0ea5e9', '#64748b'];
    return Object.entries(grouped)
      .map(([name, amount], i) => ({
        name,
        total: amount,
        percentage: (amount / total) * 100,
        color: palette[i % palette.length],
      }))
      .sort((a, b) => b.total - a.total);
  })();

  // Recent transactions (last 5)
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  const todayIso = new Date().toISOString().split('T')[0];
  const isOverdue = (t: Transaction) => !!t.due_date && t.due_date < todayIso;

  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Month header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground capitalize">{currentMonth}</h1>
          <p className="text-sm text-muted-foreground">Resumo financeiro do mês</p>
        </div>

        {loadingData ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          </div>
        ) : (
          <>
            {/* Balance Card */}
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Saldo do mês</span>
              </div>
              <p className={`text-3xl font-bold ${balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                {formatCurrency(balance)}
              </p>
            </Card>

            {/* Income / Expense Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Receitas</p>
                <p className="text-lg font-bold text-emerald-500">{formatCurrency(totalIncome)}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Despesas</p>
                <p className="text-lg font-bold text-red-500">{formatCurrency(totalExpense)}</p>
              </Card>
            </div>

            {/* Pending bills (contas a pagar/receber) */}
            {pendingBills.length > 0 && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarClock className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-foreground">Contas a pagar e a receber</h2>
                </div>
                <div className="space-y-3">
                  {pendingBills.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                          t.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                        }`}>
                          {t.type === 'income' ? (
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {t.beneficiary || t.payer || t.category}
                          </p>
                          <p className={`text-xs ${isOverdue(t) ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {t.due_date ? `Vence ${formatDate(t.due_date)}` : 'Sem data'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                          {formatCurrency(t.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-emerald-500"
                          title="Marcar como paga/recebida"
                          onClick={() => handleMarkPaid(t)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/transactions')}
                  className="text-xs text-primary font-medium cursor-pointer hover:underline mt-4"
                >
                  Ver todas
                </button>
              </Card>
            )}

            {/* Category Breakdown */}
            {expensesByCategory.length > 0 && (
              <Card className="p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">Gastos por categoria</h2>
                <div className="space-y-3">
                  {expensesByCategory.map((cat) => (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{cat.name}</span>
                        <span className="text-sm font-medium text-foreground">
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Top products (market receipts imported by photo) */}
            {topProducts.length > 0 && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Produtos do mês</h2>
                </div>
                <div className="space-y-2.5">
                  {topProducts.map((p) => (
                    <div key={p.name} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-foreground truncate">{p.name}</span>
                      <span className="text-sm font-medium text-muted-foreground flex-shrink-0">
                        {formatCurrency(p.total)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Baseado nos itens identificados nas notas importadas por foto
                </p>
              </Card>
            )}

            {/* Recent Transactions */}
            {recentTransactions.length > 0 && (
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-foreground">Últimas transações</h2>
                  <button
                    onClick={() => navigate('/transactions')}
                    className="text-xs text-primary font-medium cursor-pointer hover:underline"
                  >
                    Ver todas
                  </button>
                </div>
                <div className="space-y-3">
                  {recentTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          t.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                        }`}>
                          {t.type === 'income' ? (
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{t.category}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {t.type === 'expense' ? 'Paga' : 'Recebida'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              em {formatDate(t.date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${
                        t.type === 'income' ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Empty state */}
            {transactions.length === 0 && pendingBills.length === 0 && (
              <Card className="p-8 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Nenhuma transação este mês</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Toque no botão + para registrar sua primeira despesa ou receita
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      <AddTransactionDialog onSuccess={fetchData} />
    </AppLayout>
  );
};

export default Dashboard;
