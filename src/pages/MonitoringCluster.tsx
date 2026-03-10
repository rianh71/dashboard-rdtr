import { useMemo } from 'react';
import { DataTable } from '@/components/dashboard/DataTable';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { exportToExcel, exportToPDF } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText } from 'lucide-react';
import type { MonitoringRecord } from '@/lib/data-service';

interface MonitoringClusterProps {
  title: string;
  subtitle: string;
  data: MonitoringRecord[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hideHeader?: boolean;
}

export default function MonitoringCluster({ title, subtitle, data, isLoading, error }: MonitoringClusterProps) {
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = Object.keys(data[0]);
    return keys.map(key => ({
      key,
      header: key === 'no' ? 'No' : key === 'wilayah' ? 'Wilayah' : key === 'provinsi' ? 'Provinsi' :
        key === 'kabKota' ? 'Kab/Kota' : key === 'namaRDTR' ? 'Nama RDTR' :
        key === 'nomorPerda' ? 'Nomor Perda' : key === 'tahun' ? 'Tahun' : key,
    }));
  }, [data]);

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-destructive">Error: {error.message}</div>;
  if (!data) return null;

  const handleExportExcel = () => {
    exportToExcel(data as unknown as Record<string, unknown>[], title.replace(/\s+/g, '_'));
  };

  const handleExportPDF = () => {
    exportToPDF(
      data as unknown as Record<string, unknown>[],
      columns.slice(0, 8).map(c => ({ header: c.header, dataKey: c.key })),
      title.replace(/\s+/g, '_'),
      title
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl card-shadow p-1">
        <DataTable
          data={data as unknown as Record<string, unknown>[]}
          columns={columns}
          pageSize={20}
        />
      </div>
    </div>
  );
}
