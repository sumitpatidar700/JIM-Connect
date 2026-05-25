import { useQuery } from '@tanstack/react-query';

import { eventService } from '@/src/services/event-service';

import { queryKeys } from './query-keys';

export function useUpcomingEventsQuery(limit = 6) {
  return useQuery({
    queryFn: () => eventService.listUpcomingEvents({ limit }),
    queryKey: queryKeys.upcomingEvents(limit),
    staleTime: 1000 * 10,
    refetchInterval: 5000,
  });
}
