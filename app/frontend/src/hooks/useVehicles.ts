import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Vehicle } from '@/lib/vehicles';

export function useVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setVehicles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('vehicles').select('*').order('name');
      if (error) throw error;
      setVehicles((data as Vehicle[]) || []);
    } catch (err) {
      console.error('Error loading vehicles:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createVehicle = useCallback(
    async (input: { name: string; plate?: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('vehicles')
        .insert({ name: input.name, plate: input.plate || null, user_id: user.id })
        .select('*')
        .single();
      if (error) throw error;
      await refresh();
      return data as Vehicle;
    },
    [user, refresh]
  );

  const updateVehicle = useCallback(
    async (id: number, input: Partial<{ name: string; plate: string | null }>) => {
      const { error } = await supabase.from('vehicles').update(input).eq('id', id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const deleteVehicle = useCallback(
    async (id: number) => {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  return { vehicles, loading, refresh, createVehicle, updateVehicle, deleteVehicle };
}
