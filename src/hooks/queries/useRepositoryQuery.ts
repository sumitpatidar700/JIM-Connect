import { useQuery } from '@tanstack/react-query';

import { repositoryService } from '@/src/services/repository-service';

import { queryKeys } from './query-keys';

export function useRepositoryQuery() {
  return useQuery({
    queryFn: () => repositoryService.listRepositoryItems(),
    queryKey: queryKeys.repository,
    staleTime: 1000 * 60 * 10,
  });
}
