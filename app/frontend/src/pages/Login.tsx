import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const { user, loading, signInWithPassword, signUpWithPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha email e senha');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithPassword(email, password);
        toast.success('Login realizado!');
        navigate('/dashboard');
      } else {
        await signUpWithPassword(email, password);
        toast.success(
          'Conta criada! Verifique seu email para confirmar (se a confirmação estiver ativada).'
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao autenticar';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center dark">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg text-foreground">
            FinControl
          </span>
        </div>

        <Card className="p-6 space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'signin' ? 'default' : 'outline'}
              className="flex-1 cursor-pointer"
              onClick={() => setMode('signin')}
            >
              Entrar
            </Button>
            <Button
              type="button"
              variant={mode === 'signup' ? 'default' : 'outline'}
              className="flex-1 cursor-pointer"
              onClick={() => setMode('signup')}
            >
              Criar conta
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={submitting}
            >
              {submitting
                ? 'Aguarde...'
                : mode === 'signin'
                  ? 'Entrar'
                  : 'Criar conta'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
