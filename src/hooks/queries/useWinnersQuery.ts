import { useQuery } from '@tanstack/react-query';

import { winnerService } from '@/src/services/winner-service';

import { queryKeys } from './query-keys';

export function useWinnersQuery() {
  return useQuery({
    queryFn: () => winnerService.listWinners(),
    queryKey: queryKeys.winners,
    staleTime: 1000 * 10,
    refetchInterval: 5000,
  });
}
