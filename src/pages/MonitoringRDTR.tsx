import { useMemo, useState, useEffect } from 'react';
import { useMonitoringLogs } from '@/hooks/useRDTRData';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { ShareViewButton } from '@/components/dashboard/ShareViewButton';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, UserCheck, UserX, CalendarDays, Activity, AlertCircle, CheckCircle2, MinusCircle, XCircle, Search, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMinggu, setSelectedMinggu] = useState<number | null>(() => {
    const m = searchParams.get('minggu'); return m ? parseInt(m, 10) : null;
  });
  const [filterCluster, setFilterCluster] = useState(() => searchParams.get('cluster') || 'all');
  const [filterProvinsi, setFilterProvinsi] = useState(() => searchParams.get('provinsi') || 'all');
  const [filterStatus, setFilterStatus] = useState(() => searchParams.get('status') || 'all');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(() => {
    const ps = parseInt(searchParams.get('ps') || '20', 10);
    return [10, 25, 50, 100, 20].includes(ps) ? ps : 20;
  });
  const [pageInput, setPageInput] = useState('1');
  const [selectedRow, setSelectedRow] = useState<MonitoringLog | null>(null);

  // Sync filters to URL for Share View
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const setOrDel = (k: string, v: string) => { if (v && v !== 'all') params.set(k, v); else params.delete(k); };
    setOrDel('cluster', filterCluster);
    setOrDel('provinsi', filterProvinsi);
    setOrDel('status', filterStatus);
    setOrDel('q', searchQuery);
    if (selectedMinggu) params.set('minggu', String(selectedMinggu)); else params.delete('minggu');
    if (pageSize !== 20) params.set('ps', String(pageSize)); else params.delete('ps');
    const next = params.toString();
    if (next !== searchParams.toString()) setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCluster, filterProvinsi, filterStatus, searchQuery, selectedMinggu, pageSize]);


  const logs = data || [];
  const mingguList = useMemo(() => [...new Set(logs.map(l => l.mingguKe).filter(m => m > 0))].sort((a, b) => a - b), [logs]);
  const maxMinggu = mingguList[mingguList.length - 1] || 0;
  const activeMinggu = selectedMinggu ?? maxMinggu;
  const prevMinggu = mingguList[mingguList.indexOf(activeMinggu) - 1] ?? null;

  const currentWeek = useMemo(() => logs.filter(l => l.mingguKe === activeMinggu), [logs, activeMinggu]);
  const prevWeek = useMemo(() => prevMinggu ? logs.filter(l => l.mingguKe === prevMinggu) : [], [logs, prevMinggu]);
  const currentWeekDate = useMemo(() => {
    const counts = new Map<string, number>();
    currentWeek.forEach(l => { const t = (l.tanggal || '').trim(); if (t) counts.set(t, (counts.get(t) || 0) + 1); });
    let best = ''; let bestN = 0;
    counts.forEach((n, t) => { if (n > bestN) { best = t; bestN = n; } });
    return best;
  }, [currentWeek]);

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

  // Analytics: Top 5 Tercepat (Ada Progress) & Top 5 Terlambat (consecutive Stagnan / Tidak Ada Progress) — across all weeks, follows Cluster/Provinsi filter
  const analyticsScope = useMemo(() => {
    let r = logs;
    if (filterCluster !== 'all') r = r.filter(l => l.cluster === filterCluster);
    if (filterProvinsi !== 'all') r = r.filter(l => l.provinsi === filterProvinsi);
    return r;
  }, [logs, filterCluster, filterProvinsi]);


  const topStagnant = useMemo(() => {
    const byRdtr = new Map<string, MonitoringLog[]>();
    analyticsScope.forEach(l => {
      if (!byRdtr.has(l.namaRDTR)) byRdtr.set(l.namaRDTR, []);
      byRdtr.get(l.namaRDTR)!.push(l);
    });
    const result: [string, number][] = [];
    byRdtr.forEach((arr, name) => {
      const sorted = arr.sort((a, b) => a.mingguKe - b.mingguKe);
      let cur = 0, max = 0;
      sorted.forEach(l => {
        const sp = (l.statusProgress || '').toLowerCase();
        const isStagnan = l.statusRingkas === 'Stagnan' || (sp.includes('tidak') && sp.includes('progress'));
        if (isStagnan) { cur++; max = Math.max(max, cur); } else { cur = 0; }
      });
      if (max > 0) result.push([name, max]);
    });
    return result.sort((a, b) => b[1] - a[1]);
  }, [analyticsScope]);

  const topProgressiveAll = useMemo(() => {
    const m = new Map<string, number>();
    analyticsScope.forEach(l => {
      if ((l.statusProgress || '').toLowerCase().includes('ada progress') && !(l.statusProgress || '').toLowerCase().includes('tidak')) {
        m.set(l.namaRDTR, (m.get(l.namaRDTR) || 0) + 1);
      }
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [analyticsScope]);

  const topInactiveAll = useMemo(() => {
    const m = new Map<string, number>();
    analyticsScope.forEach(l => {
      if (l.statusRingkas === 'Tidak Aktif' || l.statusKehadiran === 'Tidak Hadir') {
        m.set(l.namaRDTR, (m.get(l.namaRDTR) || 0) + 1);
      }
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [analyticsScope]);

  const [detailOpen, setDetailOpen] = useState<null | 'progressive' | 'stagnant' | 'inactive'>(null);

  const hasActiveFilter = filterCluster !== 'all' || filterProvinsi !== 'all' || filterStatus !== 'all' || !!kpiFilter || !!searchQuery;
  const resetAllFilters = () => { setFilterCluster('all'); setFilterProvinsi('all'); setFilterStatus('all'); setKpiFilter(null); setSearchQuery(''); setPage(0); };
  const toggleKpi = (k: string) => { setKpiFilter(prev => prev === k ? null : k); setPage(0); };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  useEffect(() => { setPageInput(String(safePage + 1)); }, [safePage]);
  useEffect(() => { setPage(0); }, [pageSize]);

  function commitPageInput() {
    const n = parseInt(pageInput, 10);
    if (Number.isNaN(n) || n < 1) { setPage(0); setPageInput('1'); return; }
    if (n > totalPages) { setPage(totalPages - 1); setPageInput(String(totalPages)); return; }
    setPage(n - 1);
  }


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
            <p className="text-sm text-muted-foreground mt-1">Monitoring dan Evaluasi RDTR berdasarkan mingguan — Minggu ke-{activeMinggu}{currentWeekDate ? ` (${currentWeekDate})` : ''}</p>
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
        {/* Analytics: Top 5 Tercepat / Terlambat / Tidak Aktif */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            { key: 'progressive', title: 'Top 5 RDTR Tercepat', subtitle: 'Progress Terbanyak', data: topProgressiveAll, bar: 'bg-emerald-500', accent: 'text-emerald-700', headerBg: 'bg-emerald-50', border: 'border-emerald-200', suffix: 'x progress' },
            { key: 'stagnant', title: 'Top 5 RDTR Terlambat', subtitle: 'Stagnan Terlama', data: topStagnant, bar: 'bg-orange-500', accent: 'text-orange-700', headerBg: 'bg-orange-50', border: 'border-orange-200', suffix: 'minggu berturut' },
            { key: 'inactive', title: 'Top 5 RDTR Tidak Aktif', subtitle: 'Paling Jarang Aktif', data: topInactiveAll, bar: 'bg-red-500', accent: 'text-red-700', headerBg: 'bg-red-50', border: 'border-red-200', suffix: 'x tidak aktif' },
          ] as const).map((sec) => {
            const top5 = sec.data.slice(0, 5);
            const max = Math.max(1, ...top5.map(d => d[1]));
            return (
              <div key={sec.key} className={`rounded-lg border ${sec.border} bg-card p-4 flex flex-col`}>
                <div className={`-m-4 mb-3 p-3 rounded-t-lg ${sec.headerBg} border-b ${sec.border}`}>
                  <h3 className={`text-sm font-semibold ${sec.accent}`}>{sec.title}</h3>
                  <p className={`text-[11px] ${sec.accent} opacity-80`}>{sec.subtitle}</p>
                </div>
                {top5.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center flex-1">Tidak ada data</p>
                ) : (
                  <div className="space-y-2 flex-1">
                    {top5.map(([name, count], i) => {
                      const pct = (count / max) * 100;
                      const active = searchQuery === name;
                      return (
                        <button
                          key={name}
                          onClick={() => { setSearchQuery(active ? '' : name); setPage(0); }}
                          className={`w-full text-left group ${active ? 'ring-2 ring-primary rounded-md p-1 -m-1' : ''}`}
                          title="Klik untuk filter tabel"
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-foreground truncate pr-2">{i + 1}. {name}</span>
                            <span className="text-muted-foreground whitespace-nowrap">{count} {sec.suffix}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div className={`h-full ${sec.bar} transition-all group-hover:opacity-80`} style={{ width: `${pct}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  onClick={() => setDetailOpen(sec.key)}
                  disabled={sec.data.length === 0}
                  className={`mt-3 inline-flex items-center justify-center gap-1 text-xs font-medium ${sec.accent} hover:underline disabled:opacity-40 disabled:no-underline`}
                >
                  Lihat Detail Semua <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>

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
            <Button variant="outline" size="sm" onClick={resetAllFilters} className="gap-1.5 self-end transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <XCircle className="h-3.5 w-3.5" /> Reset Filter
            </Button>
          )}
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
                    <td className="px-3 py-2 text-foreground">{safePage * pageSize + idx + 1}</td>
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Tampilkan</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(parseInt(v, 10))}>
              <SelectTrigger className="h-8 w-[72px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span>data per halaman</span>
            <span className="hidden md:inline">·</span>
            <span className="hidden md:inline">
              {filtered.length === 0 ? '0' : `${safePage * pageSize + 1}-${Math.min((safePage + 1) * pageSize, filtered.length)}`} dari {filtered.length.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Halaman</span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitPageInput(); } }}
              onBlur={commitPageInput}
              className="h-8 w-16 text-center text-xs"
            />
            <span className="text-muted-foreground">Dari {totalPages}</span>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 transition-all hover:-translate-y-0.5 hover:shadow-sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0}><ChevronLeft className="h-3.5 w-3.5" /></Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 transition-all hover:-translate-y-0.5 hover:shadow-sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}><ChevronRight className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
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

      {/* Detail Semua Modal */}
      <Dialog open={!!detailOpen} onOpenChange={(o) => !o && setDetailOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {(() => {
            const cfg = detailOpen === 'progressive'
              ? { title: 'Semua RDTR Tercepat (Progress Terbanyak)', data: topProgressiveAll, accent: 'text-emerald-700', bar: 'bg-emerald-500', suffix: 'x progress' }
              : detailOpen === 'stagnant'
              ? { title: 'Semua RDTR Terlambat (Stagnan Terlama)', data: topStagnant, accent: 'text-orange-700', bar: 'bg-orange-500', suffix: 'minggu berturut' }
              : detailOpen === 'inactive'
              ? { title: 'Semua RDTR Tidak Aktif', data: topInactiveAll, accent: 'text-red-700', bar: 'bg-red-500', suffix: 'x tidak aktif' }
              : null;
            if (!cfg) return null;
            const max = Math.max(1, ...cfg.data.map(d => d[1]));
            return (
              <>
                <DialogHeader>
                  <DialogTitle className={`text-base ${cfg.accent}`}>{cfg.title}</DialogTitle>
                  <p className="text-xs text-muted-foreground">{cfg.data.length} RDTR — diurutkan dari nilai tertinggi</p>
                </DialogHeader>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold w-12">#</th>
                        <th className="text-left px-3 py-2 font-semibold">Nama RDTR</th>
                        <th className="text-right px-3 py-2 font-semibold w-32">Nilai</th>
                        <th className="px-3 py-2 font-semibold w-40">Distribusi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cfg.data.map(([name, count], i) => {
                        const pct = (count / max) * 100;
                        return (
                          <tr key={name} className="border-t hover:bg-muted/30">
                            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                            <td className="px-3 py-2 text-foreground font-medium">{name}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">{count} {cfg.suffix}</td>
                            <td className="px-3 py-2">
                              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                <div className={`h-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
