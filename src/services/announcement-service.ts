import { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/src/lib/supabase';
import { Announcement } from '@/src/types/app';
import { sessionService } from '@/src/services/session-service';

export const announcementService = {
  async createAnnouncement(payload: Pick<Announcement, 'description' | 'title' | 'batch_id'>) {
    const activeSession = await sessionService.getActiveSession();
    const { error } = await supabase.from('announcements').insert({
      title: payload.title,
      description: payload.description,
      batch_id: payload.batch_id ?? null,
      session_id: activeSession?.id ?? null,
    });
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

  async listAnnouncements(batchId?: string | null): Promise<Announcement[]> {
    const activeSession = await sessionService.getActiveSession();
    let query = supabase.from('announcements').select('*');
    
    if (activeSession) {
      query = query.eq('session_id', activeSession.id);
    }

    if (batchId !== undefined) {
      if (batchId === null) {
        query = query.is('batch_id', null);
      } else {
        query = query.or(`batch_id.is.null,batch_id.eq.${batchId}`);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });
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
