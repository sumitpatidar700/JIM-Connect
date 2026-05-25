import { useQuery } from '@tanstack/react-query';
import { authService } from '@/src/services/auth-service';
import { queryKeys } from './query-keys';

export function useProfileQuery(userId: string) {
  return useQuery({
    queryFn: () => authService.getProfile(userId),
    queryKey: [...queryKeys.users, 'profile', userId],
    staleTime: 1000 * 60 * 15, // 15 minutes
    enabled: !!userId,
  });
}
