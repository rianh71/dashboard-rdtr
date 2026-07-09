import { useMemo, useState, useEffect } from 'react';
import { useMainData } from '@/hooks/useRDTRData';
import { getClusterDistribution } from '@/lib/data-service';
import { DataTable } from '@/components/dashboard/DataTable';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { ShareViewButton } from '@/components/dashboard/ShareViewButton';
import { exportToExcel, exportToPDF } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSpreadsheet, FileText, ArrowLeft, FilterX, ArrowUp } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { RDTRRecord } from '@/lib/data-service';


const CLUSTER_META: Record<string, { dot: string; activeBg: string; activeBorder: string; badge: string; desc: string }> = {
  'A1': { dot: 'bg-sky-400',   activeBg: 'bg-sky-400',   activeBorder: 'border-sky-400',   badge: 'bg-sky-100 text-sky-700 border-sky-200',         desc: 'Permohonan Rekomendasi Revisi' },
  'A2': { dot: 'bg-blue-800',  activeBg: 'bg-blue-800',  activeBorder: 'border-blue-800',  badge: 'bg-blue-100 text-blue-800 border-blue-200',      desc: 'Sudah Mendapatkan Rekomendasi Revisi atau Sedang Revisi' },
  'B':  { dot: 'bg-amber-400', activeBg: 'bg-amber-400', activeBorder: 'border-amber-400', badge: 'bg-amber-100 text-amber-700 border-amber-200',   desc: 'Di Hold Daerah' },
  'C':  { dot: 'bg-red-500',   activeBg: 'bg-red-500',   activeBorder: 'border-red-500',   badge: 'bg-red-100 text-red-700 border-red-200',         desc: 'RDTR Tidak Sinkron' },
  'D':  { dot: 'bg-orange-500',activeBg: 'bg-orange-500',activeBorder: 'border-orange-500',badge: 'bg-orange-100 text-orange-700 border-orange-200',desc: 'RDTR yang Belum Memenuhi 4 Dokumen Wajib' },
  'E':  { dot: 'bg-purple-500',activeBg: 'bg-purple-500',activeBorder: 'border-purple-500',badge: 'bg-purple-100 text-purple-700 border-purple-200',desc: 'RDTR Proses Uji Titik Pasca Perkada oleh Pemerintah Daerah' },
  'F':  { dot: 'bg-lime-500',  activeBg: 'bg-lime-500',  activeBorder: 'border-lime-500',  badge: 'bg-lime-100 text-lime-700 border-lime-200',      desc: 'RDTR yang Siap Terintegrasi OSS' },
  'G':  { dot: 'bg-emerald-500',activeBg:'bg-emerald-500',activeBorder:'border-emerald-500',badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'RDTR Terintegrasi OSS' },
  'H':  { dot: 'bg-slate-500', activeBg: 'bg-slate-500', activeBorder: 'border-slate-500', badge: 'bg-slate-100 text-slate-700 border-slate-200',   desc: 'RDTR diminta Takeout dari Sistem OSS oleh Pemerintah Daerah' },
};

const MAIN_COLUMNS = [
  { key: 'no', header: 'No', width: '50px', align: 'center' as const },
  { key: 'wilayah', header: 'Wilayah', align: 'center' as const },
  { key: 'pulau', header: 'Pulau' },
  { key: 'provinsi', header: 'Provinsi' },
  { key: 'kabKota', header: 'Kab/Kota' },
  { key: 'namaRDTR', header: 'Nama RDTR', width: '280px' },
  { key: 'nomorPerda', header: 'Nomor Perda/Perkada', align: 'center' as const },
  { key: 'tahun', header: 'Tahun', width: '70px', align: 'center' as const },
  {
    key: 'cluster', header: 'Cluster', width: '90px', align: 'center' as const,
    render: (value: unknown) => {
      const c = String(value || '').trim();
      const meta = CLUSTER_META[c];
      if (!c) return '-';
      return (
        <span className={`inline-flex items-center justify-center min-w-[32px] rounded-md border px-2 py-0.5 text-xs font-semibold ${meta?.badge || 'bg-muted text-foreground border-border'}`}>
          {c}
        </span>
      );
    },
  },
  { key: 'tanggalIntegrasi', header: 'Tanggal Integrasi', align: 'center' as const },
  { key: 'keterangan', header: 'Keterangan', align: 'center' as const },
];


export default function DataRDTR() {
  const { data, isLoading, error } = useMainData();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [filterPulau, setFilterPulau] = useState('all');
  const [filterProvinsi, setFilterProvinsi] = useState('all');
  const [filterKabKota, setFilterKabKota] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWilayah, setFilterWilayah] = useState('all');
  const [filterCluster, setFilterCluster] = useState('all');
  const [viewMode, setViewMode] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<RDTRRecord | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const main = document.querySelector('main');
    const target: HTMLElement | Window = main || window;
    const onScroll = () => {
      const y = main ? main.scrollTop : window.scrollY;
      setShowBackToTop(y > 400);
    };
    target.addEventListener('scroll', onScroll as EventListener);
    return () => target.removeEventListener('scroll', onScroll as EventListener);
  }, []);

  const scrollToTop = () => {
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  // Track if navigated from another page (for back button)
  const hasViewParam = searchParams.has('view') || searchParams.has('provinsi') || searchParams.has('pulau') || searchParams.has('status') || searchParams.has('cluster');

  useEffect(() => {
    const status = searchParams.get('status');
    const tab = searchParams.get('tab');
    const provinsi = searchParams.get('provinsi');
    const kabKota = searchParams.get('kabKota');
    const pulau = searchParams.get('pulau');
    const view = searchParams.get('view');
    const cluster = searchParams.get('cluster');

    if (view) setViewMode(view);
    else setViewMode(null);

    if (status) setFilterStatus(status);
    if (provinsi) setFilterProvinsi(provinsi);
    if (kabKota) setFilterKabKota(kabKota);
    if (pulau) setFilterPulau(pulau);
    if (cluster) setFilterCluster(cluster);
  }, [searchParams]);

  // Sync filter state to URL (for Share View)
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const setOrDel = (k: string, v: string) => {
      if (v && v !== 'all') params.set(k, v); else params.delete(k);
    };
    setOrDel('wilayah', filterWilayah);
    setOrDel('pulau', filterPulau);
    setOrDel('provinsi', filterProvinsi);
    setOrDel('kabKota', filterKabKota);
    setOrDel('status', filterStatus);
    setOrDel('cluster', filterCluster);
    const next = params.toString();
    const cur = searchParams.toString();
    if (next !== cur) setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterWilayah, filterPulau, filterProvinsi, filterKabKota, filterStatus, filterCluster]);


  const wilayahOptions = useMemo(() => data ? [...new Set(data.map(r => r.wilayah).filter(Boolean))].sort() : [], [data]);
  const pulauOptions = useMemo(() => data ? [...new Set(data.map(r => r.pulau).filter(Boolean))].sort() : [], [data]);
  const provinsiOptions = useMemo(() => {
    if (!data) return [];
    const src = filterPulau !== 'all' ? data.filter(r => r.pulau === filterPulau) : data;
    return [...new Set(src.map(r => r.provinsi).filter(Boolean))].sort();
  }, [data, filterPulau]);
  const kabKotaOptions = useMemo(() => {
    if (!data) return [];
    let src = data;
    if (filterPulau !== 'all') src = src.filter(r => r.pulau === filterPulau);
    if (filterProvinsi !== 'all') src = src.filter(r => r.provinsi === filterProvinsi);
    return [...new Set(src.map(r => r.kabKota).filter(Boolean))].sort();
  }, [data, filterPulau, filterProvinsi]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(r => {
      // View mode filters
      if (viewMode === 'terintegrasi') {
        if (r.cluster !== 'G') return false;
        if (!(r.keterangan || '').toLowerCase().includes('integrasi oss')) return false;
      }
      if (viewMode === 'belum') {
        const isTerintegrasi = r.cluster === 'G' && (r.keterangan || '').toLowerCase().includes('integrasi oss');
        if (isTerintegrasi) return false;
      }

      if (filterWilayah !== 'all' && r.wilayah !== filterWilayah) return false;
      if (filterPulau !== 'all' && r.pulau !== filterPulau) return false;
      if (filterProvinsi !== 'all' && r.provinsi !== filterProvinsi) return false;
      if (filterKabKota !== 'all' && r.kabKota !== filterKabKota) return false;
      if (filterCluster !== 'all' && r.cluster !== filterCluster) return false;
      if (filterStatus === 'terintegrasi' && (!r.tanggalIntegrasi || r.tanggalIntegrasi === 'Belum Terintegrasi')) return false;
      if (filterStatus === 'belum' && r.tanggalIntegrasi && r.tanggalIntegrasi !== 'Belum Terintegrasi') return false;
      return true;
    });
  }, [data, filterWilayah, filterPulau, filterProvinsi, filterKabKota, filterCluster, filterStatus, viewMode]);

  const clusterDistribution = useMemo(() => {
    if (!data) return [];
    const present = new Map(getClusterDistribution(data).map(c => [c.cluster, c.jumlah]));
    const allClusters = Object.keys(CLUSTER_META).map(cluster => ({
      cluster,
      jumlah: present.get(cluster) || 0,
    }));
    const filteredWithoutCluster = data.filter(r => {
      if (filterWilayah !== 'all' && r.wilayah !== filterWilayah) return false;
      if (filterPulau !== 'all' && r.pulau !== filterPulau) return false;
      if (filterProvinsi !== 'all' && r.provinsi !== filterProvinsi) return false;
      if (filterStatus === 'terintegrasi' && (!r.tanggalIntegrasi || r.tanggalIntegrasi === 'Belum Terintegrasi')) return false;
      if (filterStatus === 'belum' && r.tanggalIntegrasi && r.tanggalIntegrasi !== 'Belum Terintegrasi') return false;
      return true;
    });
    const filteredCounts = new Map<string, number>();
    filteredWithoutCluster.forEach(r => {
      const c = r.cluster || 'N/A';
      filteredCounts.set(c, (filteredCounts.get(c) || 0) + 1);
    });
    const hasActiveFilter = filterWilayah !== 'all' || filterPulau !== 'all' || filterProvinsi !== 'all' || filterStatus !== 'all';
    return allClusters.map(c => ({
      ...c,
      filteredCount: filteredCounts.get(c.cluster) || 0,
      hasActiveFilter,
    }));
  }, [data, filterWilayah, filterPulau, filterProvinsi, filterStatus]);


  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-destructive">Error: {error.message}</div>;

  const handleExportExcel = () => exportToExcel(filtered as unknown as Record<string, unknown>[], 'Data_RDTR');
  const handleExportPDF = () => exportToPDF(
    filtered as unknown as Record<string, unknown>[],
    MAIN_COLUMNS.map(c => ({ header: c.header, dataKey: c.key })),
    'Data_RDTR', 'Data RDTR'
  );

  const handleClusterClick = (cluster: string) => {
    setFilterCluster(prev => prev === cluster ? 'all' : cluster);
  };

  const getViewTitle = () => {
    if (viewMode === 'total') return 'Total RDTR';
    if (viewMode === 'terintegrasi') return 'RDTR Terintegrasi (Cluster G - Integrasi OSS)';
    if (viewMode === 'belum') return 'RDTR Belum Terintegrasi';
    return 'Data RDTR';
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="bg-background p-4 md:p-6 pb-4 space-y-4 border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {hasViewParam && (
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Kembali
              </Button>
            )}
            <div>
              <h2 className="text-xl font-bold text-foreground">{getViewTitle()}</h2>
              <p className="text-sm text-muted-foreground mt-1">Database lengkap RDTR Nasional</p>
            </div>
          </div>
        </div>

        {!viewMode && (
          <>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="w-40">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Wilayah</label>
                <Select value={filterWilayah} onValueChange={setFilterWilayah}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {wilayahOptions.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Pulau</label>
                <Select value={filterPulau} onValueChange={setFilterPulau}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {pulauOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-44">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Provinsi</label>
                <Select value={filterProvinsi} onValueChange={(v) => { setFilterProvinsi(v); setFilterKabKota('all'); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {provinsiOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-44">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Kab/Kota</label>
                <Select value={filterKabKota} onValueChange={setFilterKabKota}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {kabKotaOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-44">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Status Integrasi</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="terintegrasi">Terintegrasi</SelectItem>
                    <SelectItem value="belum">Belum Terintegrasi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterWilayah('all');
                  setFilterPulau('all');
                  setFilterProvinsi('all');
                  setFilterKabKota('all');
                  setFilterStatus('all');
                  setFilterCluster('all');
                  setSearchParams({});
                }}
                className="gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 hover:-translate-y-0.5"
                title="Reset semua filter"
              >
                <FilterX className="h-3.5 w-3.5" /> Clear Filter
              </Button>

              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
                <ShareViewButton />
              </div>

            </div>

            <TooltipProvider delayDuration={200}>
              <div className="flex flex-wrap gap-3">
                {clusterDistribution.map(c => {
                  const meta = CLUSTER_META[c.cluster] || { dot: 'bg-muted-foreground', activeBg: 'bg-primary', activeBorder: 'border-primary', badge: 'bg-muted text-foreground border-border', desc: 'Cluster ' + c.cluster };
                  const isActive = filterCluster === c.cluster;
                  return (

                    <Tooltip key={c.cluster}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleClusterClick(c.cluster)}
                          className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors cursor-pointer ${
                            isActive
                              ? `${meta.activeBg} ${meta.activeBorder} text-white`
                              : 'bg-card hover:bg-muted/50'
                          }`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-white/90' : meta.dot}`} />
                          <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-foreground'}`}>
                            Cluster {c.cluster}
                          </span>
                          <span className={`text-sm ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                            ({c.jumlah})
                          </span>
                          {c.hasActiveFilter && (
                            <span className={`text-xs ${isActive ? 'text-white/70' : 'text-muted-foreground/60'}`}>
                              / {c.filteredCount} filtered
                            </span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-xs font-semibold">Cluster {c.cluster}</p>
                        <p className="text-xs">{meta.desc}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          </>
        )}
      </div>

      <div className="p-4 md:px-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Menampilkan <span className="font-semibold text-foreground">{filtered.length.toLocaleString('id-ID')}</span> data RDTR
            </p>
          </div>
          <DataTable
            data={filtered as unknown as Record<string, unknown>[]}
            columns={MAIN_COLUMNS}
            pageSize={20}
            autoNumber
            onRowClick={(row) => {
              const record = filtered.find(r => r.namaRDTR === row.namaRDTR && r.kabKota === row.kabKota);
              if (record) setSelectedRow(record);
            }}
          />
      </div>

      {/* Detail Row Dialog */}
      <Dialog open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedRow?.namaRDTR}</DialogTitle>
          </DialogHeader>
          {selectedRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Provinsi:</span> <span className="font-medium">{selectedRow.provinsi}</span></div>
                <div><span className="text-muted-foreground">Kab/Kota:</span> <span className="font-medium">{selectedRow.kabKota}</span></div>
                <div><span className="text-muted-foreground">Cluster:</span> <span className="font-medium">{selectedRow.cluster}</span></div>
                <div><span className="text-muted-foreground">Tahun:</span> <span className="font-medium">{selectedRow.tahun}</span></div>
              </div>
              <div className="border-t pt-3 space-y-3">
                <h4 className="font-semibold text-foreground text-sm">Status Unggah Data</h4>
                {[
                  { label: 'Unggah Data I (Batang tubuh, peta, lampiran bertanda tanggal)', value: selectedRow.unggahData1 },
                  { label: 'Unggah Data II (Peta digital hasil koordinasi dengan Tim Studio Peta)', value: selectedRow.unggahData2 },
                  { label: 'Unggah Data III (Lampiran ITBX format Excel)', value: selectedRow.unggahData3 },
                  { label: 'Unggah Data IV (File DBPZ)', value: selectedRow.unggahData4 },
                  { label: 'Unggah Mandiri Data Spasial', value: selectedRow.unggahMandiriSpasial },
                  { label: 'Unggah Mandiri DBPZ', value: selectedRow.unggahMandiriDBPZ },
                ].map((item, idx) => {
                  const raw = (item.value || '').toString().trim().toUpperCase();
                  const isDone = raw === 'V' || raw === '✓' || raw === 'YES' || raw === 'SUDAH';
                  const isNotDone = raw === 'X' || raw === 'TIDAK' || raw === 'BELUM' || raw === '';
                  return (
                    <div key={idx} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                      {isDone ? (
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0">
                          <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex-shrink-0">
                          <svg className="h-5 w-5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground leading-snug">{item.label}</p>
                        <span className={`text-xs font-semibold mt-0.5 inline-block ${isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {isDone ? 'Sudah Diunggah' : 'Belum Diunggah'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
          title="Kembali ke atas"
          aria-label="Kembali ke atas"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>

  );
}
