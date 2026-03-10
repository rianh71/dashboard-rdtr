import { useClusterF } from '@/hooks/useRDTRData';
import MonitoringCluster from './MonitoringCluster';

export default function ClusterFPage() {
  const { data, isLoading, error } = useClusterF();
  return (
    <MonitoringCluster
      title="Monitoring RDTR Cluster F"
      subtitle="Data monitoring real-time Cluster F"
      data={data}
      isLoading={isLoading}
      error={error}
    />
  );
}
