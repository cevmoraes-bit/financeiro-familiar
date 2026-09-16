import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Category } from '@/lib/categories';

const ICON_OPTIONS = ['🍽️', '🚗', '🏠', '💊', '🎮', '📚', '🛒', '📶', '💳', '📌', '💰', '💻', '📈', '⚡', '🐾', '🎁'];
const COLOR_OPTIONS = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#6366f1', '#f59e0b', '#dc2626', '#0ea5e9', '#64748b'];

interface FormState {
  id: number | null;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
}

const emptyForm: FormState = { id: null, name: '', type: 'expense', icon: ICON_OPTIONS[0], color: COLOR_OPTIONS[0] };

const CategoryForm = ({
  initial,
  onSave,
  onClose,
}: {
  initial: FormState;
  onSave: (form: FormState) => Promise<void>;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Informe o nome da categoria');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar categoria';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={form.type === 'expense' ? 'default' : 'outline'}
          className="flex-1 cursor-pointer"
          onClick={() => setForm((f) => ({ ...f, type: 'expense' }))}
        >
          Despesa
        </Button>
        <Button
          type="button"
          variant={form.type === 'income' ? 'default' : 'outline'}
          className="flex-1 cursor-pointer"
          onClick={() => setForm((f) => ({ ...f, type: 'income' }))}
        >
          Receita
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cat-name">Nome</Label>
        <Input
          id="cat-name"
          placeholder="Ex: Assinaturas"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>Ícone</Label>
        <div className="flex flex-wrap gap-2">
          {ICON_OPTIONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => setForm((f) => ({ ...f, icon }))}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg cursor-pointer border transition-colors ${
                form.icon === icon ? 'border-primary bg-primary/10' : 'border-border'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setForm((f) => ({ ...f, color }))}
              className={`w-8 h-8 rounded-full cursor-pointer border-2 transition-transform ${
                form.color === color ? 'border-foreground scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full cursor-pointer" disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar categoria'}
      </Button>
    </form>
  );
};

const Categories = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { expenseCategories, incomeCategories, loading, createCategory, updateCategory, deleteCategory } =
    useCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

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
        <p className="text-muted-foreground">Faça login para gerenciar categorias</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium cursor-pointer hover:opacity-90 transition-opacity"
        >
          Entrar
        </button>
      </div>
    );
  }

  const openCreate = () => {
    setEditing(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing({ id: cat.id, name: cat.name, type: cat.type, icon: cat.icon || ICON_OPTIONS[0], color: cat.color || COLOR_OPTIONS[0] });
    setDialogOpen(true);
  };

  const handleSave = async (form: FormState) => {
    if (form.id) {
      await updateCategory(form.id, { name: form.name, type: form.type, icon: form.icon, color: form.color });
      toast.success('Categoria atualizada');
    } else {
      await createCategory({ name: form.name, type: form.type, icon: form.icon, color: form.color });
      toast.success('Categoria criada');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory(deleteTarget.id);
      toast.success('Categoria excluída');
      setDeleteTarget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir categoria';
      toast.error(message);
    }
  };

  const renderList = (title: string, list: Category[]) => (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">{title}</h2>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada</p>
      ) : (
        <div className="space-y-2">
          {list.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: `${cat.color || '#64748b'}20` }}
                >
                  {cat.icon || '📌'}
                </div>
                <span className="text-sm font-medium text-foreground truncate">{cat.name}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => openEdit(cat)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(cat)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Categorias</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="cursor-pointer" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" /> Nova
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editing.id ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
              </DialogHeader>
              <CategoryForm initial={editing} onSave={handleSave} onClose={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando categorias...</p>
        ) : (
          <>
            {renderList('Despesas', expenseCategories)}
            {renderList('Receitas', incomeCategories)}
          </>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>
              As transações que usam "{deleteTarget?.name}" não serão excluídas, mas ficarão sem categoria vinculada.
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

export default Categories;
