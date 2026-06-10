import { storageService } from '@/src/services/storage-service';
import { supabase } from '@/src/lib/supabase';
import { WinnerItem } from '@/src/types/app';
import { sessionService } from '@/src/services/session-service';

type WinnerPayload = Pick<WinnerItem, 'event_id' | 'name' | 'position'> & {
  imageUri?: string;
  user_id?: string | null;
  batchId?: string | null;
};

export const winnerService = {
  async createWinner(payload: WinnerPayload) {
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('date')
      .eq('id', payload.event_id)
      .maybeSingle();

    if (eventError) {
      throw eventError;
    }

    if (!event) {
      throw new Error('Select a valid event before publishing results.');
    }

    if (new Date(event.date).getTime() > Date.now()) {
      throw new Error('Results can be declared only after the event date and time.');
    }

    const image_url = await storageService.uploadImage('winner-assets', 'winners', payload.imageUri);
    const activeSession = await sessionService.getActiveSession();
    const { error } = await supabase.from('winners').insert({
      event_id: payload.event_id,
      image_url,
      name: payload.name,
      position: payload.position,
      user_id: payload.user_id,
      session_id: activeSession?.id ?? null,
      batch_id: payload.batchId ?? null,
    });
    if (error) {
      throw error;
    }
  },

  async listWinners(batchId?: string | null): Promise<WinnerItem[]> {
    const activeSession = await sessionService.getActiveSession();
    let query = supabase.from('winners').select('*, events(title, date, venue, max_team_size), users(name, avatar_url)');
    
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

    const { data, error } = await query.order('position', { ascending: true });
    if (error) {
      throw error;
    }
    return data ?? [];
  },

  async listWinnersByEventIds(eventIds: string[]): Promise<Record<string, WinnerItem[]>> {
    if (eventIds.length === 0) {
      return {};
    }

    const { data, error } = await supabase
      .from('winners')
      .select('*, events(title, date, venue), users(name, avatar_url)')
      .in('event_id', eventIds)
      .order('position', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).reduce<Record<string, WinnerItem[]>>((groups, winner) => {
      groups[winner.event_id] = [...(groups[winner.event_id] ?? []), winner];
      return groups;
    }, {});
  },

  async updateWinner(id: string, payload: { name: string; position: string }) {
    const { error } = await supabase
      .from('winners')
      .update({ name: payload.name, position: payload.position })
      .eq('id', id);
    if (error) {
      throw error;
    }
  },

  async deleteWinner(id: string) {
    const { error } = await supabase.from('winners').delete().eq('id', id);
    if (error) {
      throw error;
    }
  },
};
