import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { eventService } from '@/src/services/event-service';
import { useAuthStore } from '@/src/store/auth-store';

import { queryKeys } from './query-keys';

export function useEventSearchQuery(query: string, options?: { committees?: string[]; clubs?: string[] }) {
  const normalizedQuery = query.trim();
  const profile = useAuthStore((state) => state.profile);
  const batchId = profile?.role === 'admin'
    ? useAuthStore.getState().adminSelectedBatch?.id ?? null
    : profile?.batch_id ?? null;

  const searchOptions = {
    ...options,
    batchId,
  };

  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => eventService.searchEvents(normalizedQuery, searchOptions),
    queryKey: queryKeys.eventSearch(normalizedQuery, searchOptions),
    staleTime: 1000 * 60, // 1 minute
  });
}
