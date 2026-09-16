import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Category, ensureDefaultCategories } from '@/lib/categories';

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setCategories([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await ensureDefaultCategories(user.id);
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createCategory = useCallback(
    async (input: { name: string; type: 'expense' | 'income'; icon?: string; color?: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...input, user_id: user.id })
        .select('*')
        .single();
      if (error) throw error;
      await refresh();
      return data as Category;
    },
    [user, refresh]
  );

  const updateCategory = useCallback(
    async (id: number, input: Partial<{ name: string; type: 'expense' | 'income'; icon: string; color: string }>) => {
      const { error } = await supabase.from('categories').update(input).eq('id', id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const deleteCategory = useCallback(
    async (id: number) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  return {
    categories,
    loading,
    refresh,
    createCategory,
    updateCategory,
    deleteCategory,
    expenseCategories: categories.filter((c) => c.type === 'expense'),
    incomeCategories: categories.filter((c) => c.type === 'income'),
  };
}
