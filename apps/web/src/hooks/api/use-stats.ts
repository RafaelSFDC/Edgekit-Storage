import { useQuery } from '@tanstack/react-query';
import { fetchStats, fetchHealth } from '../../services/api';
import { queryKeys } from './query-keys';

export function useStatsQuery() {
  return useQuery({
    queryKey: queryKeys.stats.summary(),
    queryFn: fetchStats,
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
