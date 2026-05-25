import { storageService } from '@/src/services/storage-service';
import { supabase } from '@/src/lib/supabase';
import { WinnerItem } from '@/src/types/app';

type WinnerPayload = Pick<WinnerItem, 'event_id' | 'name' | 'position'> & {
  imageUri?: string;
  user_id?: string | null;
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
    const { error } = await supabase.from('winners').insert({
      event_id: payload.event_id,
      image_url,
      name: payload.name,
      position: payload.position,
      user_id: payload.user_id,
    });
    if (error) {
      throw error;
    }
  },

  async listWinners(): Promise<WinnerItem[]> {
    const { data, error } = await supabase
      .from('winners')
      .select('*, events(title, date, venue), users(name, avatar_url)')
      .order('position', { ascending: true });
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
