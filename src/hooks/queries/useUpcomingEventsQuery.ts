import { useQuery } from '@tanstack/react-query';

import { eventService } from '@/src/services/event-service';
import { useAuthStore } from '@/src/store/auth-store';

import { queryKeys } from './query-keys';

export function useUpcomingEventsQuery(limit = 6) {
  const profile = useAuthStore((state) => state.profile);
  const batchId = profile?.role === 'admin'
    ? useAuthStore.getState().adminSelectedBatch?.id ?? null
    : profile?.batch_id ?? null;

  return useQuery({
    queryFn: () => eventService.listUpcomingEvents({ limit, batchId }),
    queryKey: queryKeys.upcomingEvents(limit, batchId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
