import { useEffect } from 'react';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

const isExpoGo = Constants.appOwnership === 'expo';
let OneSignal: any = null;
let LogLevel: any = null;

if (!isExpoGo) {
  try {
    const OneSignalModule = require('react-native-onesignal');
    OneSignal = OneSignalModule.OneSignal;
    LogLevel = OneSignalModule.LogLevel;
  } catch (e) {
    console.warn('[OneSignal] Failed to load react-native-onesignal:', e);
  }
}

export function useOneSignal() {
  useEffect(() => {
    if (!OneSignal) {
      console.log('[OneSignal] Bypassed initialization in Expo Go / simulator');
      return;
    }

    // Debug logging disabled for production

    // OneSignal Initialization
    const appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) {
        console.warn('OneSignal App ID not configured in environment variables.');
        return;
    }

    try {
      OneSignal.initialize(appId);

      // requestPermission will show the native iOS or Android notification permission prompt.
      OneSignal.Notifications.requestPermission(true);

      // Method for listening for notification clicks
      OneSignal.Notifications.addEventListener('click', (event: any) => {
        // Handle notification tap (deep link can be added here)
      });
    } catch (e) {
      console.error('[OneSignal] Initialization error:', e);
    }
  }, []);

  // Sync user with OneSignal and Supabase
  useEffect(() => {
    if (!OneSignal) return;

    const syncUserOneSignal = (session: any) => {
      // Execute asynchronously out-of-band to ensure it never blocks auth handlers or navigation transition.
      setTimeout(async () => {
        try {
          if (session?.user?.id) {
            const userId = session.user.id;
            OneSignal.login(userId);

            // Timeout helper to prevent getIdAsync from hanging indefinitely
            const getIdWithTimeout = () => {
              return new Promise<string | null>((resolve) => {
                const timer = setTimeout(() => {
                  console.warn('[OneSignal] getIdAsync timed out after 4000ms');
                  resolve(null);
                }, 4000);

                OneSignal.User.pushSubscription.getIdAsync()
                  .then((id: any) => {
                    clearTimeout(timer);
                    resolve(id || null);
                  })
                  .catch((err: any) => {
                    clearTimeout(timer);
                    console.error('[OneSignal] Error getting subscription ID:', err);
                    resolve(null);
                  });
              });
            };

            const onesignalId = await getIdWithTimeout();
            if (onesignalId) {
              console.log('[OneSignal] Syncing onesignalId to Supabase:', onesignalId);
              const { error } = await supabase
                .from('users')
                .update({ onesignal_id: onesignalId })
                .eq('id', userId);
              if (error) {
                console.error('[OneSignal] Error updating onesignal_id in Supabase:', error);
              }
            } else {
              // No push subscription ID yet (device may not have granted permission)
            }
          } else {
            OneSignal.logout();
          }
        } catch (err) {
          console.error('[OneSignal] Error in syncUserOneSignal:', err);
        }
      }, 100);
    };

    // Run initial sync asynchronously
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        syncUserOneSignal(session);
      })
      .catch((err) => {
        console.error('[OneSignal] Error getting initial session:', err);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        syncUserOneSignal(session);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
}
