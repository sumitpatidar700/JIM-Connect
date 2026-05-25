// Legacy API facade kept for compatibility with older files.
import { supabase } from './supabase';

export const api = {
  // Example: Fetch announcements
  async getAnnouncements() {
    return supabase.from('announcements').select('*').order('created_at', { ascending: false });
  },
  // Add more methods for events, registrations, winners, repository, users, etc.
};
