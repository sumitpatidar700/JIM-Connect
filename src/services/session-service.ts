import { supabase } from '@/src/lib/supabase';
import { AcademicSession } from '@/src/types/app';

export const sessionService = {
  async listSessions(): Promise<AcademicSession[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    return data ?? [];
  },

  async getActiveSession(): Promise<AcademicSession | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data;
  },

  async createSession(name: string): Promise<AcademicSession> {
    const { data, error } = await supabase
      .from('sessions')
      .insert({ name: name.trim(), is_active: false })
      .select()
      .single();
    if (error) {
      throw error;
    }
    return data;
  },

  async makeSessionActive(id: string): Promise<void> {
    // 1. Deactivate currently active session (if any)
    const { error: deactivateError } = await supabase
      .from('sessions')
      .update({ is_active: false })
      .eq('is_active', true);
    if (deactivateError) {
      throw deactivateError;
    }

    // 2. Activate the selected session
    const { error: activateError } = await supabase
      .from('sessions')
      .update({ is_active: true })
      .eq('id', id);
    if (activateError) {
      throw activateError;
    }
  },

  async deleteSession(id: string): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);
    if (error) {
      throw error;
    }
  }
};
