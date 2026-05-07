import { useMemo, useState, useEffect } from 'react';
import { useMainData } from '@/hooks/useRDTRData';
import { getClusterDistribution } from '@/lib/data-service';
import { DataTable } from '@/components/dashboard/DataTable';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { exportToExcel, exportToPDF } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSpreadsheet, FileText, Eye, ArrowLeft } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { RDTRRecord } from '@/lib/data-service';

const MAIN_COLUMNS = [
  { key: 'no', header: 'No', width: '50px', align: 'center' as const },
  { key: 'wilayah', header: 'Wilayah', align: 'center' as const },
  { key: 'pulau', header: 'Pulau' },
  { key: 'provinsi', header: 'Provinsi' },
  { key: 'kabKota', header: 'Kab/Kota' },
  { key: 'namaRDTR', header: 'Nama RDTR', width: '280px' },
  { key: 'nomorPerda', header: 'Nomor Perda/Perkada', align: 'center' as const },
  { key: 'tahun', header: 'Tahun', width: '70px', align: 'center' as const },
  { key: 'cluster', header: 'Cluster', width: '70px', align: 'center' as const },
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
  const [activeTab, setActiveTab] = useState<'table' | 'logs'>('table');
  const [selectedLog, setSelectedLog] = useState<ChangeLogEntry[] | null>(null);
  const [selectedLogName, setSelectedLogName] = useState('');
  const [logDateFilter, setLogDateFilter] = useState('');
  const [selectedRow, setSelectedRow] = useState<RDTRRecord | null>(null);

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
    if (tab === 'logs') setActiveTab('logs');
    else if (status || provinsi || pulau || view || cluster) setActiveTab('table');
  }, [searchParams]);

  useEffect(() => {
    if (data) detectChanges(data);
  }, [data]);

  const wilayahOptions = useMemo(() => data ? [...new Set(data.map(r => r.wilayah).filter(Boolean))].sort() : [], [data]);
  const pulauOptions = useMemo(() => data ? [...new Set(data.map(r => r.pulau).filter(Boolean))].sort() : [], [data]);
  const provinsiOptions = useMemo(() => data ? [...new Set(data.map(r => r.provinsi).filter(Boolean))].sort() : [], [data]);
  const kabKotaOptions = useMemo(() => {
    if (!data) return [];
    const src = filterProvinsi !== 'all' ? data.filter(r => r.provinsi === filterProvinsi) : data;
    return [...new Set(src.map(r => r.kabKota).filter(Boolean))].sort();
  }, [data, filterProvinsi]);

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
    const allClusters = getClusterDistribution(data);
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

  const changeLogs = useMemo(() => getChangeLogs(), [data]);
  const groupedLogs = useMemo(() => {
    const map = new Map<string, ChangeLogEntry[]>();
    let logs = changeLogs;
    if (logDateFilter) {
      logs = logs.filter(l => {
        const d = new Date(l.timestamp);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        return dateStr === logDateFilter;
      });
    }
    logs.forEach(log => {
      const key = `${log.namaRDTR}__${log.kabKota}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    });
    return Array.from(map.entries()).map(([, logs]) => ({
      namaRDTR: logs[0].namaRDTR,
      kabKota: logs[0].kabKota,
      provinsi: logs[0].provinsi,
      logs: logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    }));
  }, [changeLogs, logDateFilter]);

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
      <div className="sticky top-0 z-10 bg-background p-4 md:p-6 pb-4 space-y-4 border-b border-border">
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
          <div className="flex gap-2">
            <Button variant={activeTab === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('table')}>
              Tabel Data
            </Button>
            <Button variant={activeTab === 'logs' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('logs')} className="gap-1.5">
              <History className="h-3.5 w-3.5" /> Logs
            </Button>
          </div>
        </div>

        {activeTab === 'table' && !viewMode && (
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
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {clusterDistribution.map(c => (
                <button
                  key={c.cluster}
                  onClick={() => handleClusterClick(c.cluster)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors cursor-pointer ${
                    filterCluster === c.cluster
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-muted/50'
                  }`}
                >
                  <span className={`text-sm font-semibold ${filterCluster === c.cluster ? 'text-primary-foreground' : 'text-foreground'}`}>
                    Cluster {c.cluster}
                  </span>
                  <span className={`text-sm ${filterCluster === c.cluster ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    ({c.jumlah})
                  </span>
                  {c.hasActiveFilter && (
                    <span className={`text-xs ${filterCluster === c.cluster ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
                      / {c.filteredCount} filtered
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-4 md:px-6 space-y-6">
      {activeTab === 'table' && (
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
      )}

      {activeTab === 'logs' && (
        <div className="bg-card rounded-xl card-shadow p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="font-semibold text-foreground">Log Perubahan Status RDTR</h3>
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
            </div>
          </div>
          {groupedLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Belum ada perubahan yang terdeteksi.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groupedLogs.map((group, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{group.namaRDTR}</p>
                    <p className="text-xs text-muted-foreground">{group.kabKota} - {group.provinsi}</p>
                    <p className="text-xs text-muted-foreground">{group.logs.length} perubahan terdeteksi</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={() => { setSelectedLog(group.logs); setSelectedLogName(group.namaRDTR); }}>
                    <Eye className="h-3.5 w-3.5" /> View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Timeline: {selectedLogName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {selectedLog?.map((log, idx) => (
              <div key={idx} className="border-l-2 border-primary/30 pl-4 py-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-sm mt-1">
                  <span className="text-muted-foreground">{log.field === 'cluster' ? 'Cluster' : 'Keterangan'}: </span>
                  <span className="text-destructive line-through">{log.oldValue}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span className="text-primary font-medium">{log.newValue}</span>
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
