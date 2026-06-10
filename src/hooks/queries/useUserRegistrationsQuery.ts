import { useQuery } from '@tanstack/react-query';

import { eventService } from '@/src/services/event-service';

import { queryKeys } from './query-keys';

export function useUserRegistrationsQuery(userId?: string | null) {
  return useQuery({
    enabled: Boolean(userId),
    queryFn: () => eventService.listUserRegistrationsDetailed(userId as string),
    queryKey: queryKeys.userRegistrations(userId),
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}
