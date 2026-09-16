import { supabase } from '@/lib/supabase';

export async function uploadReceipt(userId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${userId}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from('receipts').upload(path, file, {
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function getReceiptUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 60 * 10);
  if (error) {
    console.error('Error creating signed url:', error);
    return null;
  }
  return data.signedUrl;
}
