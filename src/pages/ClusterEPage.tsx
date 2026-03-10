import { useClusterE } from '@/hooks/useRDTRData';
import MonitoringCluster from './MonitoringCluster';

export default function ClusterEPage() {
  const { data, isLoading, error } = useClusterE();
  return (
    <MonitoringCluster
      title="Monitoring RDTR Cluster E"
      subtitle="Data monitoring real-time Cluster E"
      data={data}
      isLoading={isLoading}
      error={error}
    />
  );
}
