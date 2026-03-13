import { useMemo, useState } from 'react';
import { useMainData } from '@/hooks/useRDTRData';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { DataTable } from '@/components/dashboard/DataTable';
import { getChangeLogs, ChangeLogEntry } from '@/lib/change-tracker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, History } from 'lucide-react';

const CLUSTER_F_CATEGORIES = [
  { key: 'menunggu-jadwal', label: 'RDTR Menunggu Jadwal Uji Coba Integrasi', match: 'menunggu jadwal uji coba' },
  { key: 'belum-surat', label: 'RDTR Belum Mengirim Surat Pernyataan', match: 'belum mengirimkan surat pernyataan' },
  { key: 'sudah-surat', label: 'RDTR Sudah Mengirim Surat Pernyataan', match: 'sudah mengirimkan surat pernyataan' },
  { key: 'kendala-substansi', label: 'RDTR Sudah dilakukan Uji Coba Integrasi Namun Terdapat Kendala Substansi', match: 'kendala substansi' },
  { key: 'kendala-teknis', label: 'RDTR Sudah Dilakukan Uji Coba Namun Ada Kendala Teknis', match: 'kendala teknis' },
  { key: 'penundaan', label: 'Permintaan Pemda Untuk Penundaan Uji Coba Integrasi OSS', match: 'penundaan uji coba' },
  { key: 'id-wilayah', label: 'RDTR Menunggu Kesepakatan Id-Wilayah', match: 'kesepakatan id-wilayah' },
];

const DETAIL_COLUMNS = [
  { key: 'no', header: 'No', width: '50px' },
  { key: 'namaRDTR', header: 'Nama RDTR' },
  { key: 'kabKota', header: 'Kab/Kota' },
  { key: 'provinsi', header: 'Provinsi' },
  { key: 'nomorPerda', header: 'Nomor Perda' },
  { key: 'keterangan', header: 'Keterangan' },
];

export default function ReportPage() {
  const { data, isLoading, error } = useMainData();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const clusterFData = useMemo(() => {
    if (!data) return [];
    return data.filter(r => r.cluster === 'F');
  }, [data]);

  const categoryData = useMemo(() => {
    return CLUSTER_F_CATEGORIES.map(cat => {
      const items = clusterFData.filter(r => {
        const ket = (r.keterangan || '').toLowerCase();
        return ket.includes(cat.match);
      });
      return { ...cat, items, count: items.length };
    });
  }, [clusterFData]);

  const changeLogs = useMemo(() => getChangeLogs(), []);

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-destructive">Error: {(error as Error).message}</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-xl font-bold text-foreground">Rekap Report Darat RDTR Cluster F</h2>
        <p className="text-sm text-muted-foreground mt-1">Rekapitulasi Cluster F</p>
      </div>

      <Tabs defaultValue="cluster-f" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="cluster-f" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Cluster F
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <History className="h-3.5 w-3.5" /> Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cluster-f" className="mt-4 space-y-4">
          {categoryData.map(cat => (
            <div key={cat.key} className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setExpandedCategory(expandedCategory === cat.key ? null : cat.key)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm font-semibold text-foreground text-left">{cat.label}</span>
                <span className="text-lg font-bold text-primary flex-shrink-0 ml-4">{cat.count}</span>
              </button>
              {expandedCategory === cat.key && cat.items.length > 0 && (
                <div className="border-t border-border px-4 py-3">
                  <DataTable
                    data={cat.items as unknown as Record<string, unknown>[]}
                    columns={DETAIL_COLUMNS}
                    pageSize={10}
                  />
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <div className="bg-card rounded-xl card-shadow p-5">
            <h3 className="font-semibold text-foreground mb-4">Tracking Timeline Perubahan Keterangan Cluster F</h3>
            {changeLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Belum ada perubahan yang terdeteksi.</p>
                <p className="text-xs mt-1">Perubahan akan tercatat secara otomatis saat data RDTR diperbarui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {changeLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-3 border-l-2 border-primary/30 pl-4 py-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{log.namaRDTR}</p>
                      <p className="text-xs text-muted-foreground">{log.kabKota} - {log.provinsi}</p>
                      <div className="mt-1 text-xs">
                        <span className="text-muted-foreground">
                          {new Date(log.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        <span className="text-muted-foreground"> — {log.field === 'cluster' ? 'Cluster' : 'Keterangan'}: </span>
                        <span className="text-destructive line-through">{log.oldValue}</span>
                        <span className="text-muted-foreground"> → </span>
                        <span className="text-primary font-medium">{log.newValue}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
