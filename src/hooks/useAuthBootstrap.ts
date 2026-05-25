import { useEffect } from 'react';

import { supabase } from '@/src/lib/supabase';
import { authService } from '@/src/services/auth-service';
import { useAuthStore } from '@/src/store/auth-store';

export function useAuthBootstrap() {
  const clearAuthState = useAuthStore((state) => state.clearAuthState);
  const setAuthState = useAuthStore((state) => state.setAuthState);
  const setBootstrapping = useAuthStore((state) => state.setBootstrapping);

  useEffect(() => {
    let mounted = true;
    const bootstrapTimeout = setTimeout(() => {
      if (mounted) {
        setBootstrapping(false);
      }
    }, 4000);

    const hydrate = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (session) {
          try {
            const profile = await authService.getProfile(session.user.id);
            if (mounted) {
              setAuthState({ profile, session });
            }
          } catch (profileError) {
            console.error("Failed to fetch profile during hydrate:", profileError);
            if (mounted) {
              // Keep the session even if profile fetch fails
              setAuthState({ profile: null, session });
            }
          }
        } else {
          clearAuthState();
        }
      } catch (error) {
        console.error("Hydration error:", error);
        if (mounted) {
          clearAuthState();
        }
      } finally {
        if (mounted) {
          setBootstrapping(false);
        }
      }
    };

    void hydrate();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session) {
          try {
            const profile = await authService.getProfile(session.user.id);
            if (mounted) {
              setAuthState({ profile, session });
            }
          } catch (profileError) {
            console.error("Failed to fetch profile during auth state change:", profileError);
            if (mounted) {
               // Only update session if profile fails, don't clear state completely
               useAuthStore.setState((state) => ({ session, profile: state.profile }));
            }
          }
        } else if (mounted) {
          clearAuthState();
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        if (mounted && _event === 'SIGNED_OUT') {
          clearAuthState();
        }
      } finally {
        if (mounted) {
          setBootstrapping(false);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(bootstrapTimeout);
      listener.subscription.unsubscribe();
    };
  }, [clearAuthState, setAuthState, setBootstrapping]);
}
