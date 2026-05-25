import { useQuery } from '@tanstack/react-query';

import { eventService } from '@/src/services/event-service';

import { queryKeys } from './query-keys';

export function useRegistrationCountsQuery(eventIds: string[]) {
  return useQuery({
    enabled: eventIds.length > 0,
    initialData: {},
    queryFn: () => eventService.listRegistrationCounts(eventIds),
    queryKey: queryKeys.registrationCounts(eventIds),
    staleTime: 1000 * 60 * 2,
  });
}
