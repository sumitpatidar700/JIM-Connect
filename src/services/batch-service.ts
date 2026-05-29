import { supabase } from '@/src/lib/supabase';
import { Batch } from '@/src/types/app';

export const batchService = {
  async listBatches(): Promise<Batch[]> {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      throw error;
    }
    return data ?? [];
  },

  async createBatch(name: string): Promise<Batch> {
    const { data, error } = await supabase
      .from('batches')
      .insert({ name: name.trim() })
      .select()
      .single();
    if (error) {
      throw error;
    }
    return data;
  },

  async deleteBatch(id: string): Promise<void> {
    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('id', id);
    if (error) {
      throw error;
    }
  },

  async updateUserBatch(userId: string, batchId: string | null): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ batch_id: batchId })
      .eq('id', userId);
    if (error) {
      throw error;
    }
  }
};
