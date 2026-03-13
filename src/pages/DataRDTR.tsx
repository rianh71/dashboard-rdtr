import { useMemo, useState, useEffect } from 'react';
import { useMainData } from '@/hooks/useRDTRData';
import { getSebaranPerProvinsi, getSebaranPerPulau, getClusterDistribution } from '@/lib/data-service';
import { DataTable } from '@/components/dashboard/DataTable';
import { IndonesiaMap } from '@/components/dashboard/IndonesiaMap';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { exportToExcel, exportToPDF } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSpreadsheet, FileText, History, Eye } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getChangeLogs, detectChanges, ChangeLogEntry } from '@/lib/change-tracker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MAIN_COLUMNS = [
  { key: 'no', header: 'No', width: '50px' },
  { key: 'wilayah', header: 'Wilayah' },
  { key: 'pulau', header: 'Pulau' },
  { key: 'provinsi', header: 'Provinsi' },
  { key: 'kabKota', header: 'Kab/Kota' },
  { key: 'namaRDTR', header: 'Nama RDTR' },
  { key: 'nomorPerda', header: 'Nomor Perda/Perkada' },
  { key: 'tahun', header: 'Tahun', width: '70px' },
  { key: 'cluster', header: 'Cluster', width: '70px' },
  { key: 'tanggalIntegrasi', header: 'Tanggal Integrasi' },
  { key: 'keterangan', header: 'Keterangan' },
];

export default function DataRDTR() {
  const { data, isLoading, error } = useMainData();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [filterPulau, setFilterPulau] = useState('all');
  const [filterProvinsi, setFilterProvinsi] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWilayah, setFilterWilayah] = useState('all');
  const [filterCluster, setFilterCluster] = useState('all');
  const [activeTab, setActiveTab] = useState<'table' | 'analytics' | 'logs'>('table');
  const [selectedLog, setSelectedLog] = useState<ChangeLogEntry[] | null>(null);
  const [selectedLogName, setSelectedLogName] = useState('');

  // Read URL params on mount and when they change
  useEffect(() => {
    const status = searchParams.get('status');
    const tab = searchParams.get('tab');
    const provinsi = searchParams.get('provinsi');
    const pulau = searchParams.get('pulau');

    if (status) setFilterStatus(status);
    if (provinsi) setFilterProvinsi(provinsi);
    if (pulau) setFilterPulau(pulau);
    if (tab === 'analytics') setActiveTab('analytics');
    else if (tab === 'logs') setActiveTab('logs');
    else if (status || provinsi || pulau) setActiveTab('table');
  }, [searchParams]);

  // Detect changes when data loads
  useEffect(() => {
    if (data) detectChanges(data);
  }, [data]);

  const wilayahOptions = useMemo(() => data ? [...new Set(data.map(r => r.wilayah).filter(Boolean))].sort() : [], [data]);
  const pulauOptions = useMemo(() => data ? [...new Set(data.map(r => r.pulau).filter(Boolean))].sort() : [], [data]);
  const provinsiOptions = useMemo(() => data ? [...new Set(data.map(r => r.provinsi).filter(Boolean))].sort() : [], [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(r => {
      if (filterWilayah !== 'all' && r.wilayah !== filterWilayah) return false;
      if (filterPulau !== 'all' && r.pulau !== filterPulau) return false;
      if (filterProvinsi !== 'all' && r.provinsi !== filterProvinsi) return false;
      if (filterCluster !== 'all' && r.cluster !== filterCluster) return false;
      if (filterStatus === 'terintegrasi' && (!r.tanggalIntegrasi || r.tanggalIntegrasi === 'Belum Terintegrasi')) return false;
      if (filterStatus === 'belum' && r.tanggalIntegrasi && r.tanggalIntegrasi !== 'Belum Terintegrasi') return false;
      return true;
    });
  }, [data, filterWilayah, filterPulau, filterProvinsi, filterCluster, filterStatus]);

  // Cluster distribution: show TOTAL counts always, highlight filtered
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

  const provinsiData = useMemo(() => data ? getSebaranPerProvinsi(data) : [], [data]);
  const pulauData = useMemo(() => data ? getSebaranPerPulau(data) : [], [data]);

  const provinceToPulau = useMemo(() => {
    if (!data) return new Map<string, string>();
    const m = new Map<string, string>();
    data.forEach(r => {
      if (r.provinsi && r.pulau) m.set(r.provinsi, r.pulau);
    });
    return m;
  }, [data]);

  // Change logs
  const changeLogs = useMemo(() => getChangeLogs(), [data]);
  const groupedLogs = useMemo(() => {
    const map = new Map<string, ChangeLogEntry[]>();
    changeLogs.forEach(log => {
      const key = `${log.namaRDTR}__${log.kabKota}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    });
    return Array.from(map.entries()).map(([key, logs]) => ({
      namaRDTR: logs[0].namaRDTR,
      kabKota: logs[0].kabKota,
      provinsi: logs[0].provinsi,
      logs: logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    }));
  }, [changeLogs]);

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-destructive">Error: {error.message}</div>;

  const handleExportExcel = () => {
    exportToExcel(filtered as unknown as Record<string, unknown>[], 'Data_RDTR');
  };

  const handleExportPDF = () => {
    exportToPDF(
      filtered as unknown as Record<string, unknown>[],
      MAIN_COLUMNS.map(c => ({ header: c.header, dataKey: c.key })),
      'Data_RDTR',
      'Data RDTR'
    );
  };

  const handleClusterClick = (cluster: string) => {
    setFilterCluster(prev => prev === cluster ? 'all' : cluster);
  };

  const handleProvinsiClick = (provinsi: string) => {
    setFilterProvinsi(provinsi);
    setActiveTab('table');
    setSearchParams({});
  };

  const handlePulauClick = (pulau: string) => {
    setFilterPulau(pulau);
    setActiveTab('table');
    setSearchParams({});
  };

  const handleMapProvinceClick = (provinsi: string) => {
    setFilterProvinsi(provinsi);
    setActiveTab('table');
    setSearchParams({});
  };

  const handleMapPulauClick = (pulau: string) => {
    setFilterPulau(pulau);
    setActiveTab('table');
    setSearchParams({});
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Data RDTR</h2>
          <p className="text-sm text-muted-foreground mt-1">Database lengkap RDTR Nasional</p>
        </div>
        <div className="flex gap-2">
          <Button variant={activeTab === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('table')}>
            Tabel Data
          </Button>
          <Button variant={activeTab === 'analytics' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('analytics')}>
            Sebaran Analytics
          </Button>
          <Button variant={activeTab === 'logs' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('logs')} className="gap-1.5">
            <History className="h-3.5 w-3.5" /> Logs
          </Button>
        </div>
      </div>

      {activeTab === 'table' && (
        <>
          {/* Filters */}
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
              <Select value={filterProvinsi} onValueChange={setFilterProvinsi}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {provinsiOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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

          {/* Cluster Summary */}
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

          <DataTable
            data={filtered as unknown as Record<string, unknown>[]}
            columns={MAIN_COLUMNS}
            pageSize={20}
          />
        </>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl card-shadow p-5">
              <h3 className="font-semibold text-foreground mb-4">RDTR per Provinsi</h3>
              <div className="overflow-y-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-semibold text-foreground">Provinsi</th>
                      <th className="text-right py-2 px-2 font-semibold text-foreground">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {provinsiData.map(p => (
                      <tr
                        key={p.provinsi}
                        className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer"
                        onClick={() => handleProvinsiClick(p.provinsi)}
                      >
                        <td className="py-1.5 px-2 text-primary hover:underline">{p.provinsi}</td>
                        <td className="py-1.5 px-2 text-right font-medium text-foreground">{p.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-card rounded-xl card-shadow p-5">
              <h3 className="font-semibold text-foreground mb-4">Peta RDTR per Provinsi</h3>
              <IndonesiaMap data={provinsiData} mode="total" onProvinceClick={handleMapProvinceClick} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl card-shadow p-5">
              <h3 className="font-semibold text-foreground mb-4">RDTR Terintegrasi per Provinsi</h3>
              <div className="overflow-y-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-semibold text-foreground">Provinsi</th>
                      <th className="text-right py-2 px-2 font-semibold text-foreground">Terintegrasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {provinsiData.filter(p => p.terintegrasi > 0).map(p => (
                      <tr
                        key={p.provinsi}
                        className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer"
                        onClick={() => handleProvinsiClick(p.provinsi)}
                      >
                        <td className="py-1.5 px-2 text-primary hover:underline">{p.provinsi}</td>
                        <td className="py-1.5 px-2 text-right font-medium text-accent">{p.terintegrasi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-card rounded-xl card-shadow p-5">
              <h3 className="font-semibold text-foreground mb-4">Peta RDTR Terintegrasi per Provinsi</h3>
              <IndonesiaMap data={provinsiData} mode="terintegrasi" onProvinceClick={handleMapProvinceClick} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl card-shadow p-5">
              <h3 className="font-semibold text-foreground mb-4">RDTR per Pulau</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-semibold text-foreground">Pulau</th>
                    <th className="text-right py-2 px-2 font-semibold text-foreground">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {pulauData.map(p => (
                    <tr
                      key={p.pulau}
                      className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => handlePulauClick(p.pulau)}
                    >
                      <td className="py-1.5 px-2 text-primary hover:underline">{p.pulau}</td>
                      <td className="py-1.5 px-2 text-right font-medium text-foreground">{p.jumlah}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-card rounded-xl card-shadow p-5">
              <h3 className="font-semibold text-foreground mb-4">Peta RDTR per Pulau</h3>
              <IndonesiaMap data={provinsiData} pulauData={pulauData} provinceToPulau={provinceToPulau} pulauMode={true} onPulauClick={handleMapPulauClick} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-card rounded-xl card-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4">Log Perubahan Status RDTR</h3>
          {groupedLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Belum ada perubahan yang terdeteksi.</p>
              <p className="text-xs mt-1">Perubahan status cluster dan keterangan akan tercatat otomatis saat data diperbarui.</p>
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 flex-shrink-0"
                    onClick={() => {
                      setSelectedLog(group.logs);
                      setSelectedLogName(group.namaRDTR);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" /> View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Log Detail Dialog */}
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
    </div>
  );
}
