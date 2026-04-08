import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClusterD, useClusterE, useClusterF } from '@/hooks/useRDTRData';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { KPICard } from '@/components/dashboard/KPICard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, UserCheck, UserX, Clock, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MonitoringRecord } from '@/lib/data-service';

const STANDARD_KEYS = ['no', 'wilayah', 'provinsi', 'kabKota', 'namaRDTR', 'nomorPerda', 'tahun'];

interface ProcessedRow {
  raw: MonitoringRecord;
  namaRDTR: string;
  provinsi: string;
  nomorPerda: string;
  tahun: number;
  statusTerakhir: string;
  updateTerakhir: string;
  keteranganSingkat: string;
  cluster: string;
  statusCategory: 'hadir' | 'tidak_hadir' | 'proses' | 'belum';
}

function categorizeStatus(val: string): 'hadir' | 'tidak_hadir' | 'proses' | 'belum' {
  if (!val) return 'belum';
  const lower = val.toLowerCase().trim();
  if (lower.includes('hadir') && !lower.includes('tidak')) return 'hadir';
  if (lower.includes('tidak hadir') || lower.includes('tidak') || lower.includes('absen')) return 'tidak_hadir';
  if (lower.includes('proses') || lower.includes('sedang') || lower.includes('progress')) return 'proses';
  // Default: if has a value, it's "hadir"
  if (lower.length > 0) return 'hadir';
  return 'belum';
}

function getStatusIndicator(cat: string) {
  switch (cat) {
    case 'hadir': return { icon: '🟢', label: 'Hadir', color: 'text-green-600' };
    case 'tidak_hadir': return { icon: '🔴', label: 'Tidak Hadir', color: 'text-red-600' };
    case 'proses': return { icon: '🟡', label: 'Proses', color: 'text-yellow-600' };
    default: return { icon: '⚪', label: 'Belum ada update', color: 'text-muted-foreground' };
  }
}

function extractDateFromKey(key: string): string {
  // Match date patterns like "1 April 2026", "19 Feb 2026", "4 Maret 2026"
  const match = key.match(/(\d{1,2}\s+\w+\s+\d{4})/);
  return match ? match[1] : '';
}

function processClusterData(data: MonitoringRecord[] | undefined, clusterName: string): ProcessedRow[] {
  if (!data) return [];
  return data.map(record => {
    const dynamicKeys = Object.keys(record).filter(k => !STANDARD_KEYS.includes(k));
    let lastValue = '';
    let lastKey = '';
    let lastDate = '';
    // Iterate from right (last column) to find last non-empty
    for (let i = dynamicKeys.length - 1; i >= 0; i--) {
      const val = String(record[dynamicKeys[i]] || '').trim();
      if (val) {
        lastValue = val;
        lastKey = dynamicKeys[i];
        // Find the date: check this key or nearby "Rencana Tindak Lanjut" key
        const dateFromKey = extractDateFromKey(lastKey);
        if (dateFromKey) {
          lastDate = dateFromKey;
        } else {
          // If this is a "Kehadiran" column, look at the previous key for the date
          for (let j = i - 1; j >= 0; j--) {
            const prevDate = extractDateFromKey(dynamicKeys[j]);
            if (prevDate) {
              lastDate = prevDate;
              break;
            }
          }
        }
        break;
      }
    }
    return {
      raw: record,
      namaRDTR: record.namaRDTR || '',
      provinsi: record.provinsi || '',
      nomorPerda: record.nomorPerda || '',
      tahun: record.tahun || 0,
      statusTerakhir: lastValue,
      updateTerakhir: lastDate || '',
      keteranganSingkat: lastValue.length > 80 ? lastValue.substring(0, 80) + '...' : lastValue,
      cluster: clusterName,
      statusCategory: categorizeStatus(lastValue),
    };
  });
}

const CLUSTER_LABELS: Record<string, string> = {
  'D': 'RDTR YANG BELUM MEMENUHI 4 DOKUMEN WAJIB',
  'E': 'RDTR PROSES UJI TITIK PASCA PERKADA OLEH PEMERINTAH DAERAH',
  'F': 'RDTR YANG SIAP TERINTEGRASI OSS',
};

export default function MonitoringRDTR() {
  const clusterD = useClusterD();
  const clusterE = useClusterE();
  const clusterF = useClusterF();

  const [activeCluster, setActiveCluster] = useState('all');
  const [filterProvinsi, setFilterProvinsi] = useState('all');
  const [filterTahun, setFilterTahun] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const viewMode = 'ringkas' as const;
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedRow, setSelectedRow] = useState<ProcessedRow | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const isLoading = clusterD.isLoading || clusterE.isLoading || clusterF.isLoading;
  const error = clusterD.error || clusterE.error || clusterF.error;

  const allProcessed = useMemo(() => {
    const d = processClusterData(clusterD.data, 'D');
    const e = processClusterData(clusterE.data, 'E');
    const f = processClusterData(clusterF.data, 'F');
    return [...d, ...e, ...f];
  }, [clusterD.data, clusterE.data, clusterF.data]);

  const lastUpdateDate = useMemo(() => {
    const dates = allProcessed.map(r => r.updateTerakhir).filter(Boolean);
    return dates.length > 0 ? dates[dates.length - 1] : '-';
  }, [allProcessed]);

  const filtered = useMemo(() => {
    let result = allProcessed;
    if (activeCluster !== 'all') result = result.filter(r => r.cluster === activeCluster);
    if (filterProvinsi !== 'all') result = result.filter(r => r.provinsi === filterProvinsi);
    if (filterTahun !== 'all') result = result.filter(r => String(r.tahun) === filterTahun);
    if (filterStatus !== 'all') result = result.filter(r => r.statusCategory === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => r.namaRDTR.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const cmp = a.updateTerakhir.localeCompare(b.updateTerakhir);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [allProcessed, activeCluster, filterProvinsi, filterTahun, filterStatus, searchQuery, sortDir]);

  const kpi = useMemo(() => {
    const total = filtered.length;
    const hadir = filtered.filter(r => r.statusCategory === 'hadir').length;
    const tidakHadir = filtered.filter(r => r.statusCategory === 'tidak_hadir').length;
    const proses = filtered.filter(r => r.statusCategory === 'proses').length;
    return { total, hadir, tidakHadir, proses };
  }, [filtered]);

  const clusterTotals = useMemo(() => {
    const d = processClusterData(clusterD.data, 'D').length;
    const e = processClusterData(clusterE.data, 'E').length;
    const f = processClusterData(clusterF.data, 'F').length;
    return { all: d + e + f, D: d, E: e, F: f };
  }, [clusterD.data, clusterE.data, clusterF.data]);

  const provinsiOptions = useMemo(() => [...new Set(allProcessed.map(r => r.provinsi).filter(Boolean))].sort(), [allProcessed]);
  const tahunOptions = useMemo(() => [...new Set(allProcessed.map(r => String(r.tahun)).filter(t => t !== '0'))].sort(), [allProcessed]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-destructive">Error: {(error as Error).message}</div>;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="sticky top-0 z-10 bg-background p-4 md:p-6 pb-4 space-y-4 border-b border-border">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-foreground">Monitoring RDTR</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitoring kondisi terkini RDTR Cluster D, E, dan F</p>
          <p className="text-xs text-muted-foreground mt-1">Last Update: {lastUpdateDate || '-'}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard title="Total RDTR" value={kpi.total} icon={Users} gradient="blue" />
          <KPICard title="Total Hadir" value={kpi.hadir} icon={UserCheck} gradient="emerald" />
          <KPICard title="Total Tidak Hadir" value={kpi.tidakHadir} icon={UserX} gradient="orange" />
          <KPICard title="Total Dalam Proses" value={kpi.proses} icon={Clock} gradient="purple" />
        </div>
      </div>

      <div className="p-4 md:px-6 space-y-4">

      {/* Filters: Provinsi, Tahun, Status */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-40">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Provinsi</label>
          <Select value={filterProvinsi} onValueChange={v => { setFilterProvinsi(v); setPage(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {provinsiOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-28">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Tahun</label>
          <Select value={filterTahun} onValueChange={v => { setFilterTahun(v); setPage(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {tahunOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
          <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="hadir">🟢 Hadir</SelectItem>
              <SelectItem value="tidak_hadir">🔴 Tidak Hadir</SelectItem>
              <SelectItem value="proses">🟡 Proses</SelectItem>
              <SelectItem value="belum">⚪ Belum Update</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cluster Tabs */}
      <Tabs value={activeCluster} onValueChange={v => { setActiveCluster(v); setPage(0); }} className="w-auto">
        <TabsList>
          <TabsTrigger value="all">Semua ({clusterTotals.all})</TabsTrigger>
          <TabsTrigger value="D">Cluster D ({clusterTotals.D})</TabsTrigger>
          <TabsTrigger value="E">Cluster E ({clusterTotals.E})</TabsTrigger>
          <TabsTrigger value="F">Cluster F ({clusterTotals.F})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search above table */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari nama RDTR..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(0); }} className="pl-9" />
      </div>

      {/* Table */}
      {/* Table */}
      <div className="space-y-3">
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground w-12">No</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground">Nama RDTR</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground">Provinsi</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground">Nomor Perda/Perkada</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground w-16">Tahun</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground">Status Terakhir</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground cursor-pointer" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                    <span className="inline-flex items-center gap-1">
                      Update Terakhir
                      {sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </span>
                  </th>
                  <th className="text-center px-3 py-2.5 font-semibold text-foreground">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Tidak ada data</td></tr>
                ) : paged.map((row, idx) => {
                  const si = getStatusIndicator(row.statusCategory);
                  return (
                    <tr key={idx} className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelectedRow(row)}>
                      <td className="px-3 py-2 text-foreground">{page * pageSize + idx + 1}</td>
                      <td className="px-3 py-2 text-foreground font-medium">{row.namaRDTR}</td>
                      <td className="px-3 py-2 text-foreground">{row.provinsi}</td>
                      <td className="px-3 py-2 text-foreground">{row.nomorPerda || '-'}</td>
                      <td className="px-3 py-2 text-foreground">{row.tahun || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1.5 ${si.color}`}>
                          <span>{si.icon}</span> {si.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-foreground whitespace-nowrap">{row.updateTerakhir || 'Tidak Ada Update'}</td>
                      <td className="px-3 py-2 text-foreground max-w-[200px] truncate text-center">{row.keteranganSingkat || '-'}</td>
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedRow?.namaRDTR}</DialogTitle>
          </DialogHeader>
          {selectedRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Provinsi:</span> <span className="font-medium text-foreground">{selectedRow.provinsi}</span></div>
                <div><span className="text-muted-foreground">Tahun:</span> <span className="font-medium text-foreground">{selectedRow.tahun}</span></div>
                <div><span className="text-muted-foreground">Cluster:</span> <span className="font-medium text-foreground">{selectedRow.cluster}</span></div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <span className={getStatusIndicator(selectedRow.statusCategory).color}>
                    {getStatusIndicator(selectedRow.statusCategory).icon} {getStatusIndicator(selectedRow.statusCategory).label}
                  </span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Histori Update</h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {Object.keys(selectedRow.raw).filter(k => !STANDARD_KEYS.includes(k)).map(key => {
                    const val = String(selectedRow.raw[key] || '');
                    if (!val) return null;
                    return (
                      <div key={key} className="border-l-2 border-primary/30 pl-3 py-1.5">
                        <p className="text-xs font-medium text-muted-foreground">{key}</p>
                        <p className="text-sm text-foreground">{val}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
