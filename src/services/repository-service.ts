import { storageService } from '@/src/services/storage-service';
import { supabase } from '@/src/lib/supabase';
import { RepositoryItem } from '@/src/types/app';

type RepositoryPayload = Pick<RepositoryItem, 'description' | 'event_id'> & {
  imageUri?: string;
};

export const repositoryService = {
  async createRepositoryItem(payload: RepositoryPayload) {
    const image_url = await storageService.uploadImage('repository-assets', 'repository', payload.imageUri);
    const { error } = await supabase.from('repository').insert({
      description: payload.description,
      event_id: payload.event_id,
      image_url,
    });
    if (error) {
      throw error;
    }
  },

  async listRepositoryItems(): Promise<RepositoryItem[]> {
    const { data, error } = await supabase
      .from('repository')
      .select('*, events(title, date, venue)')
      .order('id', { ascending: false });
    if (error) {
      throw error;
    }
    return data ?? [];
  },
};
