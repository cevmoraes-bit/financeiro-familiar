import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  List, 
  LogOut, 
  TrendingUp,
  User
} from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/transactions', label: 'Transações', icon: List },
  ];

  return (
    <div className="min-h-screen bg-background dark">
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">FinControl</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="cursor-pointer h-8 w-8"
                onClick={() => navigate('/dashboard')}
              >
                <User className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="cursor-pointer h-8 w-8"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 pb-24">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>

        {/* Bottom Navigation (mobile-first) */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-2 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                    isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default AppLayout;