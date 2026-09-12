import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight 
} from 'lucide-react';
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

interface CategorySummary {
  name: string;
  total: number;
  percentage: number;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Alimentação': '#f97316',
  'Transporte': '#3b82f6',
  'Moradia': '#8b5cf6',
  'Saúde': '#10b981',
  'Lazer': '#ec4899',
  'Educação': '#6366f1',
  'Compras': '#f59e0b',
  'Salário': '#10b981',
  'Freelance': '#3b82f6',
  'Investimentos': '#8b5cf6',
  'Outros': '#64748b',
};

const Dashboard = () => {
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoadingData(true);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      
      const response = await client.entities.transactions.query({
        query: {},
        sort: '-date',
        limit: 500,
      });
      
      const allTransactions: Transaction[] = response?.data?.items || [];
      // Filter current month transactions
      const monthTransactions = allTransactions.filter(
        (t) => t.date >= startOfMonth
      );
      setTransactions(monthTransactions);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      return;
    }
    if (user) {
      fetchTransactions();
    }
  }, [user, authLoading, fetchTransactions]);

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
          onClick={login}
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
    return Object.entries(grouped)
      .map(([name, amount]) => ({
        name,
        total: amount,
        percentage: (amount / total) * 100,
        color: CATEGORY_COLORS[name] || '#64748b',
      }))
      .sort((a, b) => b.total - a.total);
  })();

  // Recent transactions (last 5)
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

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
                          <p className="text-xs text-muted-foreground">
                            {t.description || new Date(t.date).toLocaleDateString('pt-BR')}
                          </p>
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
            {transactions.length === 0 && (
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

      <AddTransactionDialog onSuccess={fetchTransactions} />
    </AppLayout>
  );
};

export default Dashboard;