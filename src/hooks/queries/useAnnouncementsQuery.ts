import { useQuery } from '@tanstack/react-query';

import { announcementService } from '@/src/services/announcement-service';
import { useAuthStore } from '@/src/store/auth-store';

import { queryKeys } from './query-keys';

export function useAnnouncementsQuery() {
  const profile = useAuthStore((state) => state.profile);
  // Admin selected context vs student's own batch
  const batchId = profile?.role === 'admin'
    ? useAuthStore.getState().adminSelectedBatch?.id ?? null
    : profile?.batch_id ?? null;

  return useQuery({
    queryFn: () => announcementService.listAnnouncements(batchId),
    queryKey: queryKeys.announcements(batchId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
