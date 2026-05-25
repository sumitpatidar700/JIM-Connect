import { useQuery } from '@tanstack/react-query';

import { eventService } from '@/src/services/event-service';

import { queryKeys } from './query-keys';

export function useEventByIdQuery(id?: string | null) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => eventService.getEventById(id as string),
    queryKey: queryKeys.eventById(id ?? ''),
    staleTime: 1000 * 60 * 5,
  });
}
