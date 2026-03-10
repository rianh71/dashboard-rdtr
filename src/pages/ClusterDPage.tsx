import { useClusterD } from '@/hooks/useRDTRData';
import MonitoringCluster from './MonitoringCluster';

export default function ClusterDPage() {
  const { data, isLoading, error } = useClusterD();
  return (
    <MonitoringCluster
      title="Monitoring RDTR Cluster D"
      subtitle="Data monitoring real-time Cluster D"
      data={data}
      isLoading={isLoading}
      error={error}
    />
  );
}
