import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClusterD, useClusterE, useClusterF } from '@/hooks/useRDTRData';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { KPICard } from '@/components/dashboard/KPICard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, UserCheck, UserX, Clock, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

const PIE_COLORS = ['#16a34a', '#dc2626', '#eab308', '#d1d5db'];

export default function MonitoringRDTR() {
  const clusterD = useClusterD();
  const clusterE = useClusterE();
  const clusterF = useClusterF();

  const [activeCluster, setActiveCluster] = useState('all');
  const [filterProvinsi, setFilterProvinsi] = useState('all');
  const [filterTahun, setFilterTahun] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'ringkas' | 'detail'>('ringkas');
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

  const pieData = useMemo(() => [
    { name: 'Hadir', value: kpi.hadir },
    { name: 'Tidak Hadir', value: kpi.tidakHadir },
    { name: 'Proses', value: kpi.proses },
    { name: 'Belum Update', value: filtered.filter(r => r.statusCategory === 'belum').length },
  ].filter(d => d.value > 0), [kpi, filtered]);

  const barData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => map.set(r.cluster, (map.get(r.cluster) || 0) + 1));
    return Array.from(map.entries()).map(([cluster, jumlah]) => ({ cluster: `Cluster ${cluster}`, jumlah })).sort((a, b) => a.cluster.localeCompare(b.cluster));
  }, [filtered]);

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

      <div className="p-4 md:px-6 space-y-6">

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl card-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4">Distribusi Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name}: ${e.value}`} fontSize={11}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl card-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4">Jumlah RDTR per Cluster</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,92%)" />
              <XAxis dataKey="cluster" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="jumlah" fill="#2962FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <Tabs value={activeCluster} onValueChange={v => { setActiveCluster(v); setPage(0); }} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="D">Cluster D</TabsTrigger>
            <TabsTrigger value="E">Cluster E</TabsTrigger>
            <TabsTrigger value="F">Cluster F</TabsTrigger>
          </TabsList>
        </Tabs>
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
        <div className="relative w-56">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Cari RDTR</label>
          <Search className="absolute left-3 bottom-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Nama RDTR..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant={viewMode === 'ringkas' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('ringkas')}>Ringkas</Button>
          <Button variant={viewMode === 'detail' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('detail')}>Detail</Button>
        </div>
      </div>

      {/* Table */}
      {viewMode === 'ringkas' ? (
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
      ) : (
        /* Detail mode: show all raw columns */
        <div className="space-y-3">
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground w-12">No</th>
                  {allProcessed.length > 0 && Object.keys(allProcessed[0].raw).filter(k => k !== 'no').map(key => (
                    <th key={key} className="text-left px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">
                      {key === 'wilayah' ? 'Wilayah' : key === 'provinsi' ? 'Provinsi' : key === 'kabKota' ? 'Kab/Kota' :
                        key === 'namaRDTR' ? 'Nama RDTR' : key === 'nomorPerda' ? 'Nomor Perda' : key === 'tahun' ? 'Tahun' : key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={20} className="text-center py-8 text-muted-foreground">Tidak ada data</td></tr>
                ) : paged.map((row, idx) => (
                  <tr key={idx} className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelectedRow(row)}>
                    <td className="px-3 py-2 text-foreground">{page * pageSize + idx + 1}</td>
                    {Object.keys(row.raw).filter(k => k !== 'no').map(key => (
                      <td key={key} className="px-3 py-2 text-foreground whitespace-nowrap">{String(row.raw[key] || '-')}</td>
                    ))}
                  </tr>
                ))}
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
      )}

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
