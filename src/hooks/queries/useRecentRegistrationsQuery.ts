import { useQuery } from '@tanstack/react-query';
import { eventService } from '@/src/services/event-service';
import { queryKeys } from './query-keys';

export function useRecentRegistrationsQuery(limit = 10) {
  return useQuery({
    queryFn: () => eventService.listRecentRegistrations(limit),
    queryKey: ['registrations', 'recent', limit],
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
