import { useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { supabase } from '../api/supabase';

export function useAuthListener() {
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) setUser(session.user);
      else clearUser();
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [clearUser, setUser]);
}
