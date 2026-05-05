import { useMemo, useState } from 'react';
import { useMonitoringLogs } from '@/hooks/useRDTRData';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { KPICard } from '@/components/dashboard/KPICard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Users, UserCheck, UserX, CalendarDays, Activity, AlertCircle, CheckCircle2, MinusCircle, XCircle, Search, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/export-utils';
import type { MonitoringLog } from '@/lib/data-service';

const STATUS_RINGKAS = {
  'Aktif (Monitoring)': { color: 'bg-green-500', label: 'Aktif (Monitoring)', text: 'text-green-700' },
  'Aktif (Non Monitoring)': { color: 'bg-green-500', label: 'Aktif (Non Monitoring)', text: 'text-green-700' },
  'Stagnan': { color: 'bg-yellow-500', label: 'Stagnan', text: 'text-yellow-700' },
  'Tidak Aktif': { color: 'bg-gray-400', label: 'Tidak Aktif', text: 'text-gray-700' },
  'Bermasalah (Keluar Cluster)': { color: 'bg-red-500', label: 'Bermasalah', text: 'text-red-700' },
  'Selesai (Keluar Cluster)': { color: 'bg-blue-500', label: 'Selesai', text: 'text-blue-700' },
} as const;

function getStatusMeta(s: string) {
  return STATUS_RINGKAS[s as keyof typeof STATUS_RINGKAS] || { color: 'bg-muted', label: s || '-', text: 'text-muted-foreground' };
}

function isAktif(s: string) { return s === 'Aktif (Monitoring)' || s === 'Aktif (Non Monitoring)'; }

export default function MonitoringRDTR() {
  const { data, isLoading, error } = useMonitoringLogs();
  const [selectedMinggu, setSelectedMinggu] = useState<number | null>(null);
  const [filterCluster, setFilterCluster] = useState('all');
  const [filterProvinsi, setFilterProvinsi] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selectedRow, setSelectedRow] = useState<MonitoringLog | null>(null);
  const pageSize = 20;

  const logs = data || [];
  const mingguList = useMemo(() => [...new Set(logs.map(l => l.mingguKe).filter(m => m > 0))].sort((a, b) => a - b), [logs]);
  const maxMinggu = mingguList[mingguList.length - 1] || 0;
  const activeMinggu = selectedMinggu ?? maxMinggu;
  const prevMinggu = mingguList[mingguList.indexOf(activeMinggu) - 1] ?? null;

  const currentWeek = useMemo(() => logs.filter(l => l.mingguKe === activeMinggu), [logs, activeMinggu]);
  const prevWeek = useMemo(() => prevMinggu ? logs.filter(l => l.mingguKe === prevMinggu) : [], [logs, prevMinggu]);

  const countBy = (arr: MonitoringLog[], pred: (l: MonitoringLog) => boolean) => arr.filter(pred).length;

  const kpi = useMemo(() => {
    const c = currentWeek;
    const p = prevWeek;
    return {
      totalPertemuan: maxMinggu,
      totalRDTR: new Set(c.map(l => l.namaRDTR)).size,
      hadir: { now: countBy(c, l => l.statusKehadiran === 'Hadir'), prev: countBy(p, l => l.statusKehadiran === 'Hadir') },
      tidakHadir: { now: countBy(c, l => l.statusKehadiran === 'Tidak Hadir'), prev: countBy(p, l => l.statusKehadiran === 'Tidak Hadir') },
      aktif: { now: countBy(c, l => isAktif(l.statusRingkas)), prev: countBy(p, l => isAktif(l.statusRingkas)) },
      stagnan: { now: countBy(c, l => l.statusRingkas === 'Stagnan'), prev: countBy(p, l => l.statusRingkas === 'Stagnan') },
      tidakAktif: { now: countBy(c, l => l.statusRingkas === 'Tidak Aktif'), prev: countBy(p, l => l.statusRingkas === 'Tidak Aktif') },
      bermasalah: { now: countBy(c, l => l.statusRingkas === 'Bermasalah (Keluar Cluster)'), prev: countBy(p, l => l.statusRingkas === 'Bermasalah (Keluar Cluster)') },
      selesai: { now: countBy(c, l => l.statusRingkas === 'Selesai (Keluar Cluster)'), prev: countBy(p, l => l.statusRingkas === 'Selesai (Keluar Cluster)') },
    };
  }, [currentWeek, prevWeek, maxMinggu]);

  const clusterOptions = useMemo(() => [...new Set(logs.map(l => l.cluster).filter(Boolean))].sort(), [logs]);
  const provinsiOptions = useMemo(() => [...new Set(logs.map(l => l.provinsi).filter(Boolean))].sort(), [logs]);

  const [kpiFilter, setKpiFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let r = currentWeek;
    if (filterCluster !== 'all') r = r.filter(l => l.cluster === filterCluster);
    if (filterProvinsi !== 'all') r = r.filter(l => l.provinsi === filterProvinsi);
    if (filterStatus !== 'all') r = r.filter(l => l.statusRingkas === filterStatus);
    if (kpiFilter === 'hadir') r = r.filter(l => l.statusKehadiran === 'Hadir');
    else if (kpiFilter === 'tidakHadir') r = r.filter(l => l.statusKehadiran === 'Tidak Hadir');
    else if (kpiFilter === 'aktif') r = r.filter(l => isAktif(l.statusRingkas));
    else if (kpiFilter === 'stagnan') r = r.filter(l => l.statusRingkas === 'Stagnan');
    else if (kpiFilter === 'tidakAktif') r = r.filter(l => l.statusRingkas === 'Tidak Aktif');
    else if (kpiFilter === 'bermasalah') r = r.filter(l => l.statusRingkas === 'Bermasalah (Keluar Cluster)');
    else if (kpiFilter === 'selesai') r = r.filter(l => l.statusRingkas === 'Selesai (Keluar Cluster)');
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      r = r.filter(l => l.namaRDTR.toLowerCase().includes(q) || l.provinsi.toLowerCase().includes(q));
    }
    return r;
  }, [currentWeek, filterCluster, filterProvinsi, filterStatus, searchQuery, kpiFilter]);

  const hasActiveFilter = filterCluster !== 'all' || filterProvinsi !== 'all' || filterStatus !== 'all' || !!kpiFilter || !!searchQuery;
  const resetAllFilters = () => { setFilterCluster('all'); setFilterProvinsi('all'); setFilterStatus('all'); setKpiFilter(null); setSearchQuery(''); setPage(0); };
  const toggleKpi = (k: string) => { setKpiFilter(prev => prev === k ? null : k); setPage(0); };

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const handleExportExcel = () => {
    exportToExcel(filtered.map((l, i) => ({
      No: i + 1, 'Minggu Ke-': l.mingguKe, Tanggal: l.tanggal, Provinsi: l.provinsi, 'Kab/Kota': l.kabKota,
      'Nama RDTR': l.namaRDTR, Cluster: l.cluster, 'Status Kehadiran': l.statusKehadiran, 'Status Ringkas': l.statusRingkas,
      'Update Terbaru': l.updateTerbaru, 'Isu/Kendala': l.isuKendala, 'Perlu Tindak Lanjut': l.perluTindakLanjut,
    })) as unknown as Record<string, unknown>[], 'Monitoring_RDTR');
  };
  const handleExportPDF = () => {
    exportToPDF(filtered.map((l, i) => ({
      no: i + 1, namaRDTR: l.namaRDTR, provinsi: l.provinsi, cluster: l.cluster,
      kehadiran: l.statusKehadiran, status: l.statusRingkas, update: l.updateTerbaru,
    })) as unknown as Record<string, unknown>[], [
      { header: 'No', dataKey: 'no' }, { header: 'Nama RDTR', dataKey: 'namaRDTR' },
      { header: 'Provinsi', dataKey: 'provinsi' }, { header: 'Cluster', dataKey: 'cluster' },
      { header: 'Kehadiran', dataKey: 'kehadiran' }, { header: 'Status', dataKey: 'status' },
      { header: 'Update', dataKey: 'update' },
    ], 'Monitoring_RDTR', `Monitoring RDTR - Minggu ke ${activeMinggu}`);
  };

  const history = useMemo(() => {
    if (!selectedRow) return [];
    return logs.filter(l => l.namaRDTR === selectedRow.namaRDTR).sort((a, b) => a.mingguKe - b.mingguKe);
  }, [logs, selectedRow]);

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-destructive">Error: {(error as Error).message}</div>;

  const Trend = ({ now, prev }: { now: number; prev: number }) => {
    if (prev === 0 && now === 0) return null;
    const diff = now - prev;
    if (diff === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="h-3 w-3" />0</span>;
    const pos = diff > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs ${pos ? 'text-green-600' : 'text-red-600'}`}>
        {pos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {pos ? '+' : ''}{diff}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="sticky top-0 z-10 bg-background p-4 md:p-6 pb-4 space-y-4 border-b border-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-foreground">Monitoring RDTR</h2>
            <p className="text-sm text-muted-foreground mt-1">Monitoring berdasarkan logs mingguan — Minggu ke-{activeMinggu}</p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Pilih Minggu Ke-</label>
              <Select value={String(activeMinggu)} onValueChange={v => { setSelectedMinggu(parseInt(v)); setPage(0); }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mingguList.map(m => <SelectItem key={m} value={String(m)}>Minggu ke-{m}{m === maxMinggu ? ' (Terbaru)' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* KPI Row 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <CalendarDays className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold mt-2 text-foreground">{kpi.totalPertemuan}</p>
            <p className="text-xs text-muted-foreground">Total Pertemuan</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Dari total {mingguList.length} minggu periode monitoring</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold mt-2 text-foreground">{kpi.totalRDTR}</p>
            <p className="text-xs text-muted-foreground">Total RDTR</p>
          </div>
          {([
            { key: 'hadir', label: 'Total Hadir', value: kpi.hadir, icon: UserCheck, color: 'text-green-600' },
            { key: 'tidakHadir', label: 'Total Tidak Hadir', value: kpi.tidakHadir, icon: UserX, color: 'text-red-600' },
          ] as const).map(c => {
            const active = kpiFilter === c.key;
            return (
              <button key={c.key} onClick={() => toggleKpi(c.key)} className={`text-left rounded-lg border bg-card p-4 transition-all hover:bg-muted/30 ${active ? 'ring-2 ring-primary border-primary shadow-md' : ''}`}>
                <div className="flex items-center justify-between">
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                  <Trend now={c.value.now} prev={c.value.prev} />
                </div>
                <p className="text-2xl font-bold mt-2 text-foreground">{c.value.now}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </button>
            );
          })}
        </div>

        {/* KPI Row 2 - Status Ringkas */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { key: 'aktif', label: 'Aktif', value: kpi.aktif, dot: 'bg-green-500', icon: Activity },
            { key: 'stagnan', label: 'Stagnan', value: kpi.stagnan, dot: 'bg-yellow-500', icon: MinusCircle },
            { key: 'tidakAktif', label: 'Tidak Aktif', value: kpi.tidakAktif, dot: 'bg-gray-400', icon: XCircle },
            { key: 'bermasalah', label: 'Bermasalah', value: kpi.bermasalah, dot: 'bg-red-500', icon: AlertCircle },
            { key: 'selesai', label: 'Selesai', value: kpi.selesai, dot: 'bg-blue-500', icon: CheckCircle2 },
          ].map(s => {
            const active = kpiFilter === s.key;
            return (
              <button key={s.key} onClick={() => toggleKpi(s.key)} className={`text-left rounded-lg border bg-card p-4 transition-all hover:bg-muted/30 ${active ? 'ring-2 ring-primary border-primary shadow-md' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                    <s.icon className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <Trend now={s.value.now} prev={s.value.prev} />
                </div>
                <p className="text-2xl font-bold mt-2 text-foreground">{s.value.now}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 md:px-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-36">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Cluster</label>
            <Select value={filterCluster} onValueChange={v => { setFilterCluster(v); setPage(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {clusterOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Provinsi</label>
            <Select value={filterProvinsi} onValueChange={v => { setFilterProvinsi(v); setPage(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {provinsiOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-52">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Status Ringkas</label>
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {Object.keys(STATUS_RINGKAS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-64">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Cari</label>
            <Search className="absolute left-3 top-[34px] h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nama RDTR / Provinsi..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(0); }} className="pl-9" />
          </div>
          {hasActiveFilter && (
            <Button variant="outline" size="sm" onClick={resetAllFilters} className="gap-1.5 self-end">
              <XCircle className="h-3.5 w-3.5" /> Reset Filter
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-3 py-2.5 font-semibold w-12">No</th>
                <th className="text-left px-3 py-2.5 font-semibold">Nama RDTR</th>
                <th className="text-left px-3 py-2.5 font-semibold">Provinsi</th>
                <th className="text-center px-3 py-2.5 font-semibold w-20">Cluster</th>
                <th className="text-center px-3 py-2.5 font-semibold">Kehadiran</th>
                <th className="text-left px-3 py-2.5 font-semibold">Status Ringkas</th>
                <th className="text-left px-3 py-2.5 font-semibold">Update Terbaru</th>
                <th className="text-center px-3 py-2.5 font-semibold w-20">Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Tidak ada data</td></tr>
              ) : paged.map((row, idx) => {
                const meta = getStatusMeta(row.statusRingkas);
                const tindak = row.perluTindakLanjut?.toLowerCase() === 'ya';
                const update = row.statusKehadiran === 'Tidak Hadir' ? 'Tidak ada update (tidak hadir)' : (row.updateTerbaru || '-');
                return (
                  <tr key={idx} className={`border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors ${tindak ? 'bg-red-50/40' : ''}`} onClick={() => setSelectedRow(row)}>
                    <td className="px-3 py-2 text-foreground">{page * pageSize + idx + 1}</td>
                    <td className="px-3 py-2 text-foreground font-medium">{row.namaRDTR}</td>
                    <td className="px-3 py-2 text-foreground">{row.provinsi}</td>
                    <td className="px-3 py-2 text-center text-foreground">{row.cluster || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={row.statusKehadiran === 'Hadir' ? 'text-green-600' : row.statusKehadiran === 'Tidak Hadir' ? 'text-red-600' : 'text-muted-foreground'}>
                        {row.statusKehadiran || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-2 ${meta.text}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${meta.color}`} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-foreground max-w-[280px] truncate" title={update}>{update}</td>
                    <td className="px-3 py-2 text-center">
                      {tindak ? <span className="text-red-600 font-medium">Ya</span> : <span className="text-muted-foreground">Tidak</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Menampilkan {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filtered.length)} dari {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}><ChevronLeft className="h-3.5 w-3.5" /></Button>
              <span className="text-xs text-muted-foreground px-2">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}><ChevronRight className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}
      </div>

      {/* Side Drawer */}
      <Sheet open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">{selectedRow?.namaRDTR}</SheetTitle>
          </SheetHeader>
          {selectedRow && (
            <div className="mt-4 space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Provinsi:</span> <span className="font-medium">{selectedRow.provinsi}</span></div>
                <div><span className="text-muted-foreground">Kab/Kota:</span> <span className="font-medium">{selectedRow.kabKota}</span></div>
                <div><span className="text-muted-foreground">Cluster:</span> <span className="font-medium">{selectedRow.cluster}</span></div>
                <div><span className="text-muted-foreground">Minggu Ke-:</span> <span className="font-medium">{selectedRow.mingguKe}</span></div>
                <div><span className="text-muted-foreground">Kehadiran:</span> <span className="font-medium">{selectedRow.statusKehadiran}</span></div>
                <div className="flex items-center gap-2"><span className="text-muted-foreground">Status:</span> <span className={`h-2 w-2 rounded-full ${getStatusMeta(selectedRow.statusRingkas).color}`} /><span className="font-medium">{selectedRow.statusRingkas}</span></div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Detail Update</h4>
                <p className="text-sm text-foreground bg-muted/30 p-3 rounded">{selectedRow.detailUpdate || '-'}</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Last Update Sebelumnya</h4>
                <p className="text-sm text-foreground bg-muted/30 p-3 rounded">{selectedRow.lastUpdateSebelumnya || '-'}</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Isu / Kendala</h4>
                <p className="text-sm text-foreground bg-muted/30 p-3 rounded">{selectedRow.isuKendala || '-'}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Riwayat Status (Minggu 1 → {maxMinggu})</h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {history.map((h, i) => {
                    const m = getStatusMeta(h.statusRingkas);
                    return (
                      <div key={i} className="border-l-2 border-primary/30 pl-3 py-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Minggu {h.mingguKe}</span>
                          <span>•</span>
                          <span>{h.tanggal}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <span className={`h-2 w-2 rounded-full ${m.color}`} />
                          <span className={m.text}>{m.label}</span>
                          <span className="text-muted-foreground">— {h.statusKehadiran}</span>
                        </div>
                        {h.updateTerbaru && h.statusKehadiran !== 'Tidak Hadir' && (
                          <p className="text-xs text-muted-foreground mt-1">{h.updateTerbaru}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
