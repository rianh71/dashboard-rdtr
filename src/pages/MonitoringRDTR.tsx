import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClusterD, useClusterE, useClusterF } from '@/hooks/useRDTRData';
import MonitoringCluster from './MonitoringCluster';

export default function MonitoringRDTR() {
  const clusterD = useClusterD();
  const clusterE = useClusterE();
  const clusterF = useClusterF();

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-xl font-bold text-foreground">Monitoring RDTR</h2>
        <p className="text-sm text-muted-foreground mt-1">Data monitoring real-time Cluster D, E, dan F</p>
      </div>

      <Tabs defaultValue="cluster-d" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="cluster-d">Cluster D</TabsTrigger>
          <TabsTrigger value="cluster-e">Cluster E</TabsTrigger>
          <TabsTrigger value="cluster-f">Cluster F</TabsTrigger>
        </TabsList>
        <TabsContent value="cluster-d" className="mt-4">
          <MonitoringCluster
            title="Monitoring RDTR Cluster D"
            subtitle="Data monitoring real-time Cluster D"
            data={clusterD.data}
            isLoading={clusterD.isLoading}
            error={clusterD.error}
            hideHeader
          />
        </TabsContent>
        <TabsContent value="cluster-e" className="mt-4">
          <MonitoringCluster
            title="Monitoring RDTR Cluster E"
            subtitle="Data monitoring real-time Cluster E"
            data={clusterE.data}
            isLoading={clusterE.isLoading}
            error={clusterE.error}
            hideHeader
          />
        </TabsContent>
        <TabsContent value="cluster-f" className="mt-4">
          <MonitoringCluster
            title="Monitoring RDTR Cluster F"
            subtitle="Data monitoring real-time Cluster F"
            data={clusterF.data}
            isLoading={clusterF.isLoading}
            error={clusterF.error}
            hideHeader
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
