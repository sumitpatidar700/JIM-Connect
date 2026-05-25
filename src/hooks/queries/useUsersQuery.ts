import { useQuery } from '@tanstack/react-query';
import { authService } from '@/src/services/auth-service';
import { queryKeys } from './query-keys';

export function useUsersQuery(searchQuery?: string, limit: number = 50) {
  return useQuery({
    queryFn: () => authService.listUsers(searchQuery, limit),
    queryKey: [...queryKeys.users, searchQuery, limit],
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}
