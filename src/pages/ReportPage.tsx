import { useMemo, useState, useEffect } from 'react';
import { useMainData } from '@/hooks/useRDTRData';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { DataTable } from '@/components/dashboard/DataTable';
import { fetchLogsFromSheet, ChangeLogEntry } from '@/lib/change-tracker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, History, RefreshCw, ArrowLeft } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  { key: 'no', header: 'No', width: '50px', align: 'center' as const },
  { key: 'namaRDTR', header: 'Nama RDTR', align: 'left' as const },
  { key: 'kabKota', header: 'Kab/Kota', align: 'center' as const },
  { key: 'provinsi', header: 'Provinsi', align: 'center' as const },
  { key: 'nomorPerda', header: 'Nomor Perda/Perkada', align: 'center' as const },
  { key: 'keterangan', header: 'Keterangan', align: 'center' as const },
];

export default function ReportPage() {
  const { data, isLoading, error } = useMainData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filterParam = searchParams.get('filter');
  const hasFilter = !!filterParam;

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Auto-expand category from URL param
  useEffect(() => {
    if (filterParam) setExpandedCategory(filterParam);
  }, [filterParam]);

  const clusterFData = useMemo(() => {
    if (!data) return [];
    return data.filter(r => r.cluster === 'F');
  }, [data]);

  // Logs: only cluster G
  const clusterGData = useMemo(() => {
    if (!data) return [];
    return data.filter(r => r.cluster === 'G');
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

  const [changeLogs, setChangeLogs] = useState<ChangeLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logDateFilter, setLogDateFilter] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState('all');

  const loadLogs = async () => {
    setLogsLoading(true);
    const logs = await fetchLogsFromSheet();
    setChangeLogs(logs);
    setLogsLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  // Filter logs: only cluster G RDTR
  const clusterGNames = useMemo(() => {
    return new Set(clusterGData.map(r => r.namaRDTR.toLowerCase().trim()));
  }, [clusterGData]);

  const filteredLogs = useMemo(() => {
    let logs = changeLogs.filter(l => clusterGNames.has(l.namaRDTR.toLowerCase().trim()));
    if (logDateFilter) {
      logs = logs.filter(l => {
        const d = new Date(l.timestamp);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        return dateStr === logDateFilter;
      });
    }
    return logs;
  }, [changeLogs, logDateFilter, clusterGNames]);

  const categoryFilteredLogs = useMemo(() => {
    if (logCategoryFilter === 'all') return filteredLogs;
    const cat = CLUSTER_F_CATEGORIES.find(c => c.key === logCategoryFilter);
    if (!cat) return filteredLogs;
    return filteredLogs.filter(l => {
      const val = (l.newValue || '').toLowerCase();
      return val.includes(cat.match);
    });
  }, [filteredLogs, logCategoryFilter]);

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-destructive">Error: {(error as Error).message}</div>;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="sticky top-0 z-10 bg-background p-4 md:p-6 pb-4 space-y-4 border-b border-border">
        <div className="flex items-center gap-3">
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
          )}
          <div>
            <h2 className="text-xl font-bold text-foreground">Rekap Report Darat RDTR Cluster F</h2>
            <p className="text-sm text-muted-foreground mt-1">Rekapitulasi Cluster F</p>
          </div>
        </div>
      </div>

      <div className="p-4 md:px-6 space-y-6">

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
            <div key={cat.key} className={`bg-card rounded-xl border overflow-hidden ${filterParam === cat.key ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
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
                    searchable={false}
                    autoNumber
                  />
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <div className="bg-card rounded-xl card-shadow p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="font-semibold text-foreground">Tracking Timeline Perubahan Data RDTR (Cluster G)</h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Filter Tanggal:</label>
                <Input
                  type="date"
                  value={logDateFilter}
                  onChange={e => setLogDateFilter(e.target.value)}
                  className="w-40 h-8 text-xs"
                />
                {logDateFilter && (
                  <Button variant="ghost" size="sm" onClick={() => setLogDateFilter('')} className="text-xs h-8">Reset</Button>
                )}
                <button onClick={loadLogs} disabled={logsLoading} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 ml-2">
                  <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
            </div>

            {/* Category filter for logs */}
            <div className="mb-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Filter Kategori:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={logCategoryFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setLogCategoryFilter('all')}
                >
                  Semua
                </Button>
                {CLUSTER_F_CATEGORIES.map(cat => (
                  <Button
                    key={cat.key}
                    variant={logCategoryFilter === cat.key ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setLogCategoryFilter(cat.key)}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>

            {categoryFilteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Belum ada perubahan yang terdeteksi.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categoryFilteredLogs.map((log, idx) => (
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
    </div>
  );
}
