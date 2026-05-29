import { useQuery } from '@tanstack/react-query';

import { winnerService } from '@/src/services/winner-service';
import { useAuthStore } from '@/src/store/auth-store';

import { queryKeys } from './query-keys';

export function useWinnersQuery() {
  const profile = useAuthStore((state) => state.profile);
  const batchId = profile?.role === 'admin'
    ? useAuthStore.getState().adminSelectedBatch?.id ?? null
    : profile?.batch_id ?? null;

  return useQuery({
    queryFn: () => winnerService.listWinners(batchId),
    queryKey: queryKeys.winners(batchId),
    staleTime: 1000 * 10,
    refetchInterval: 5000,
  });
}
