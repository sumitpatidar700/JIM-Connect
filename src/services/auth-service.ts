import { clearAppQueryCache } from '@/src/lib/query-client';
import { hasSupabaseConfig, supabase } from '@/src/lib/supabase';
import { storageService } from '@/src/services/storage-service';
import { UserProfile } from '@/src/types/app';

type Credentials = {
  email: string;
  password: string;
};

type SignupPayload = Credentials & {
  avatarImageUri: string;
  name: string;
  phone?: string;
};

type ProfileUpdatePayload = {
  name: string;
  phone?: string;
  userId: string;
};

function ensureSupabaseConfigured() {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase environment variables are missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
}

function normalizePhoneNumber(phone?: string | null) {
  const trimmed = phone?.trim() ?? '';
  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length !== 10) {
    throw new Error('Enter a valid 10 digit phone number.');
  }

  return digits;
}

async function ensurePhoneAvailable(phone: string | null, userId?: string) {
  if (!phone) {
    return;
  }

  let query = supabase.from('users').select('id').eq('phone', phone).limit(1);
  if (userId) {
    query = query.neq('id', userId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  if (data && data.length > 0) {
    throw new Error('This phone number is already linked to another account.');
  }
}

export const authService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (error) {
      throw error;
    }
    return data;
  },

  async signIn({ email, password }: Credentials) {
    ensureSupabaseConfigured();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    clearAppQueryCache();
  },

  async signUp({ avatarImageUri, email, name, password, phone }: SignupPayload) {
    ensureSupabaseConfigured();
    const normalizedPhone = normalizePhoneNumber(phone);
    await ensurePhoneAvailable(normalizedPhone);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone: normalizedPhone,
        },
      },
    });
    if (error) {
      throw error;
    }

    if (data.user) {
      const avatarUrl = await storageService.uploadImage(
        'profile-assets',
        `avatars/${data.user.id}`,
        avatarImageUri,
      );

      const { error: profileError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl, phone: normalizedPhone })
        .eq('id', data.user.id);

      if (profileError) {
        throw profileError;
      }
    }

    return data;
  },
  async updateProfile({ name, phone, userId }: ProfileUpdatePayload) {
    if (!userId) {
      throw new Error('Missing user id');
    }

    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new Error('Name is required.');
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    await ensurePhoneAvailable(normalizedPhone, userId);

    const { data, error } = await supabase
      .from('users')
      .update({ name: normalizedName, phone: normalizedPhone })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('This phone number is already linked to another account.');
      }
      throw error;
    }

    return data as UserProfile;
  },
  async updatePrivacy(userId: string, isPrivate: boolean) {
    if (!userId) {
      throw new Error('Missing user id');
    }
    const { data, error } = await supabase
      .from('users')
      .update({ is_private: isPrivate })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }
    return data as UserProfile;
  },
  async updateAvatar(userId: string, avatarImageUri?: string | null) {
    if (!userId) {
      throw new Error('Missing user id');
    }

    if (!avatarImageUri) {
      // clear avatar
      const { error } = await supabase.from('users').update({ avatar_url: null }).eq('id', userId);
      if (error) throw error;
      return null;
    }

    const avatarUrl = await storageService.uploadImage(
      'profile-assets',
      `avatars/${userId}`,
      avatarImageUri,
    );

    const { error } = await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', userId);
    if (error) {
      throw error;
    }

    return avatarUrl;
  },
  async listUsers(searchQuery?: string, limit: number = 50): Promise<UserProfile[]> {
    let query = supabase.rpc('get_directory_users');
    
    if (searchQuery) {
      const qs = searchQuery.trim();
      query = query.or(`name.ilike.%${qs}%,email.ilike.%${qs}%,phone.ilike.%${qs}%`);
    }

    const { data, error } = await query
      .order("name", { ascending: true })
      .limit(limit);
    if (error) {
      throw error;
    }
    return data || [];
  },
  
  async sendPasswordResetEmail(email: string) {
    ensureSupabaseConfigured();
    // Default redirect uses the app's scheme if possible, or fallback to your Supabase site URL settings
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "jiconnect://reset-password",
    });
    if (error) {
      throw error;
    }
  },

  async updatePassword(password: string) {
    ensureSupabaseConfigured();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw error;
    }
  },
};
