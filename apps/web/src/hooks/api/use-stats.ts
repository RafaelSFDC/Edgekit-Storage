import { useQuery } from '@tanstack/react-query';
import { fetchFiles, fetchHealth } from '../../services/api';
import { queryKeys } from './query-keys';
import type { StorageStats } from '../../types';

export function useStatsQuery() {
  return useQuery({
    queryKey: queryKeys.stats.summary(),
    queryFn: async (): Promise<StorageStats> => {
      // Fetch up to 100 files for local stats computation
      const data = await fetchFiles({ limit: 100 });
      const objects = data.objects || [];

      const totalFiles = objects.length;
      const totalBytes = objects.reduce((acc, curr) => acc + (curr.size || 0), 0);
      const privateFiles = objects.filter((o) => o.isPrivate).length;
      const publicFiles = totalFiles - privateFiles;

      const folderSet = new Set<string>();
      objects.forEach((obj) => {
        const parts = obj.key.split('/');
        if (parts.length > 1) {
          folderSet.add(parts[0]);
        }
      });

      return {
        totalFiles,
        totalBytes,
        privateFiles,
        publicFiles,
        foldersCount: folderSet.size,
      };
    },
    staleTime: 30_000,
  });
}

export function useHealthQuery() {
  return useQuery({
    queryKey: queryKeys.health.check(),
    queryFn: fetchHealth,
    refetchInterval: 60_000,
    retry: false,
  });
}
