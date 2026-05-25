import { Redirect } from 'expo-router';

import { LoadingState } from '@/components/ui/LoadingState';
import { useAuthStore } from '@/src/store/auth-store';

export default function IndexScreen() {
  const { isBootstrapping, profile, session } = useAuthStore();

  if (isBootstrapping) {
    return <LoadingState fullScreen message="Checking your campus session..." />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profile?.role === 'admin') {
    return <Redirect href="/(app)/(tabs)/admin-dashboard" />;
  }

  return <Redirect href="/(app)/(tabs)" />;
}
