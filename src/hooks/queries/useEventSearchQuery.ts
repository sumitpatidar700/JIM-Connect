import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { eventService } from '@/src/services/event-service';

import { queryKeys } from './query-keys';

export function useEventSearchQuery(query: string, options?: { committees?: string[]; clubs?: string[] }) {
  const normalizedQuery = query.trim();

  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => eventService.searchEvents(normalizedQuery, options),
    queryKey: queryKeys.eventSearch(normalizedQuery, options),
    staleTime: 1000 * 10,
    refetchInterval: 5000,
  });
}
