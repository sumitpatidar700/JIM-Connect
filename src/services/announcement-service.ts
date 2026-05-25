import { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/src/lib/supabase';
import { Announcement } from '@/src/types/app';

export const announcementService = {
  async createAnnouncement(payload: Pick<Announcement, 'description' | 'title'>) {
    const { error } = await supabase.from('announcements').insert(payload);
    if (error) {
      throw error;
    }
  },

  async deleteAnnouncement(id: string) {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      throw error;
    }
  },

  async listAnnouncements(): Promise<Announcement[]> {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    return data ?? [];
  },

  subscribeToAnnouncements(onChange: () => void): RealtimeChannel {
    return supabase
      .channel(`announcements-feed-${Date.now()}-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, onChange)
      .subscribe();
  },

  unsubscribe(channel: RealtimeChannel) {
    supabase.removeChannel(channel).catch(() => undefined);
  },

  async updateAnnouncement(id: string, payload: Pick<Announcement, 'description' | 'title'>) {
    const { error } = await supabase.from('announcements').update(payload).eq('id', id);
    if (error) {
      throw error;
    }
  },
};
