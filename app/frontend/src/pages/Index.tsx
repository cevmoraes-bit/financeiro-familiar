import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { TrendingUp, Shield, Zap, PieChart } from 'lucide-react';

const Index = () => {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark">
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-foreground">FinControl</span>
          </div>
          <Button onClick={login} variant="outline" size="sm" className="cursor-pointer">
            Entrar
          </Button>
        </header>

        {/* Hero */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-md mx-auto space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Controle suas finanças em{' '}
                <span className="text-primary">tempo real</span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Registre despesas instantaneamente do celular ou computador. 
                Saiba exatamente para onde seu dinheiro está indo.
              </p>
            </div>

            <Button 
              onClick={login} 
              size="lg" 
              className="w-full sm:w-auto px-8 py-6 text-base font-medium cursor-pointer"
            >
              Iniciar controle
            </Button>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
                <Zap className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium text-foreground">Registro rápido</span>
                <span className="text-xs text-muted-foreground">Em segundos</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
                <PieChart className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">Categorias</span>
                <span className="text-xs text-muted-foreground">Organize tudo</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
                <Shield className="w-5 h-5 text-chart-2" />
                <span className="text-sm font-medium text-foreground">Seguro</span>
                <span className="text-xs text-muted-foreground">Seus dados protegidos</span>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            Use no celular ou computador • Seus dados sincronizados em tempo real
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;