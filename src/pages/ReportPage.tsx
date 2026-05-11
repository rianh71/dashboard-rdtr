import { useMemo, useState, useEffect } from 'react';
import { useMainData } from '@/hooks/useRDTRData';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { DataTable } from '@/components/dashboard/DataTable';
import { ArrowLeft } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

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
  { key: 'tahun', header: 'Tahun', align: 'center' as const },
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




  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-destructive">Error: {(error as Error).message}</div>;

  return (
    <div className="space-y-0 max-w-[1400px] mx-auto">
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
        <div className="mt-4 space-y-4">
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
        </div>
      </div>
    </div>
  );
}
