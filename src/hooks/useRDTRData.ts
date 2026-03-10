import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMainData, fetchClusterD, fetchClusterE, fetchClusterF } from '@/lib/data-service';

export function useMainData() {
  return useQuery({
    queryKey: ['rdtr-main'],
    queryFn: fetchMainData,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useClusterD() {
  return useQuery({
    queryKey: ['cluster-d'],
    queryFn: fetchClusterD,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useClusterE() {
  return useQuery({
    queryKey: ['cluster-e'],
    queryFn: fetchClusterE,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useClusterF() {
  return useQuery({
    queryKey: ['cluster-f'],
    queryFn: fetchClusterF,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['rdtr-main'] });
    queryClient.invalidateQueries({ queryKey: ['cluster-d'] });
    queryClient.invalidateQueries({ queryKey: ['cluster-e'] });
    queryClient.invalidateQueries({ queryKey: ['cluster-f'] });
  };
}
