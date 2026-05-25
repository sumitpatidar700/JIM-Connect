import { useQuery } from '@tanstack/react-query';

import { eventService } from '@/src/services/event-service';

import { queryKeys } from './query-keys';

export function useEventRegistrationsQuery(eventId?: string | null) {
  return useQuery({
    enabled: Boolean(eventId),
    queryFn: () => eventService.listRegistrationsForEvent(eventId as string),
    queryKey: queryKeys.eventRegistrations(eventId),
    staleTime: 1000 * 60 * 2,
  });
}
