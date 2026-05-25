import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const hasSupabaseConfig =
  SUPABASE_URL !== 'https://placeholder.supabase.co' && SUPABASE_ANON_KEY !== 'placeholder-anon-key';

const isWeb = Platform.OS === 'web';

const storage = {
  async getItem(key: string) {
    if (isWeb && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }

    return AsyncStorage.getItem(key);
  },

  async removeItem(key: string) {
    if (isWeb && typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }

    await AsyncStorage.removeItem(key);
  },

  async setItem(key: string, value: string) {
    if (isWeb && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }

    await AsyncStorage.setItem(key, value);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    persistSession: true,
    storage,
  },
});
