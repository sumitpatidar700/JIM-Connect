import { useQuery } from '@tanstack/react-query';

import { announcementService } from '@/src/services/announcement-service';

import { queryKeys } from './query-keys';

export function useAnnouncementsQuery() {
  return useQuery({
    queryFn: () => announcementService.listAnnouncements(),
    queryKey: queryKeys.announcements,
    staleTime: 1000 * 10,
    refetchInterval: 5000,
  });
}
