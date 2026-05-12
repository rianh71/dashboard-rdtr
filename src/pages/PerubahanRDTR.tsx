import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { DataTable } from '@/components/dashboard/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, TrendingDown, Minus, FileText, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Papa from 'papaparse';

const BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vST7goQce4BhG1s50o2MF_rEvZFiHFPdkoY5Kqql00euIAylRApG9EagCjbbqGNBI_QLD6c0pD8_EV2/pub';
const KBLI_CSV_URL = `${BASE_URL}?gid=0&single=true&output=csv`;
const DISINTEGRASI_CSV_URL = `${BASE_URL}?gid=1838633116&single=true&output=csv`;
const LOGS_CSV_URL = 'https://docs.google.com/spreadsheets/d/1TzSRQ_XFu3CzYlzaPPjPRnC6bC5mPxkCQmB5tM0KIEI/gviz/tq?tqx=out:csv&gid=1220668751';

interface KBLIRecord {
  namaRDTR: string;
  provinsi: string;
  kabKota: string;
  nomorPerda: string;
  tahun: string;
  keterangan: string;
}

interface DisintegrasiRecord {
  namaRDTR: string;
  provinsi: string;
  kabKota: string;
  nomorPerda: string;
  tahun: string;
  tanggalIntegrasi: string;
  tanggalDisintegrasi: string;
  keterangan: string;
}

interface LogRecord {
  tanggal: string;
  provinsi: string;
  kabKota: string;
  namaRDTR: string;
  cluster: string;
  keterangan: string;
  nilaiLama: string;
  nilaiBaru: string;
  dampak: 'Membaik' | 'Memburuk' | 'Stagnan';
  clusterLama?: number;
  clusterBaru?: number;
}

const CLUSTER_RANK: Record<string, number> = {
  'A1': 1, 'A2': 2, 'B': 3, 'C': 4, 'D': 5, 'E': 6, 'F': 7, 'G': 8,
};

function extractClusterRank(value: string): number | null {
  if (!value) return null;
  const match = value.match(/Cluster\s+(A1|A2|[B-G])/i);
  if (match) {
    const key = match[1].toUpperCase();
    return CLUSTER_RANK[key] ?? null;
  }
  return null;
}

// Stage hierarchy for "Dampak Perubahan" — higher rank = more advanced/better
const STAGE_PATTERNS: { rank: number; patterns: RegExp[] }[] = [
  { rank: 1, patterns: [/belum\s+diterima/i, /belum\s+lengkap/i, /belum\s+mengirim\s+surat/i] },
  { rank: 2, patterns: [/sudah\s+mengirim\s+surat/i] },
  { rank: 3, patterns: [/(sedang|proses)\s+uji\s+petik/i] },
  { rank: 4, patterns: [/menunggu\s+jadwal\s+integrasi/i] },
  { rank: 5, patterns: [/siap\s+(untuk\s+)?integrasi/i] },
  { rank: 6, patterns: [/terintegrasi/i, /integrasi\s+oss/i] },
];

function extractStageRank(value: string): number | null {
  if (!value) return null;
  for (let i = STAGE_PATTERNS.length - 1; i >= 0; i--) {
    if (STAGE_PATTERNS[i].patterns.some(re => re.test(value))) return STAGE_PATTERNS[i].rank;
  }
  return null;
}

function computeDampak(
  nilaiLama: string,
  nilaiBaru: string,
  lamaClusterRank: number | null,
  baruClusterRank: number | null,
): 'Membaik' | 'Memburuk' | 'Stagnan' {
  const lamaNorm = nilaiLama.trim().toLowerCase().replace(/\s+/g, ' ');
  const baruNorm = nilaiBaru.trim().toLowerCase().replace(/\s+/g, ' ');

  // Stagnan only if values are truly identical
  if (lamaNorm === baruNorm) return 'Stagnan';

  // 1. Stage hierarchy comparison
  const lamaStage = extractStageRank(nilaiLama);
  const baruStage = extractStageRank(nilaiBaru);
  if (lamaStage !== null && baruStage !== null) {
    if (baruStage > lamaStage) return 'Membaik';
    if (baruStage < lamaStage) return 'Memburuk';
  }

  // 2. Cluster rank comparison (lower cluster letter rank = more advanced in source data)
  if (lamaClusterRank !== null && baruClusterRank !== null) {
    if (baruClusterRank < lamaClusterRank) return 'Membaik';
    if (baruClusterRank > lamaClusterRank) return 'Memburuk';
  }

  // 3. Single-side stage detected → infer direction
  if (baruStage !== null && lamaStage === null) return 'Membaik';
  if (lamaStage !== null && baruStage === null) return 'Memburuk';

  // 4. Any other textual difference defaults to Membaik (data was updated)
  return 'Membaik';
}
  // "12 Februari 2026" → timestamp
  const months: Record<string, number> = {
    januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
    juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
  };
  const parts = t.trim().split(/\s+/);
  if (parts.length >= 3) {
    const d = parseInt(parts[0], 10);
    const m = months[parts[1].toLowerCase()];
    const y = parseInt(parts[2], 10);
    if (!isNaN(d) && m !== undefined && !isNaN(y)) {
      return new Date(y, m, d).getTime();
    }
  }
  return 0;
}

async function fetchKBLI(): Promise<KBLIRecord[]> {
  const res = await fetch(KBLI_CSV_URL);
  if (!res.ok) throw new Error('Failed to fetch KBLI data');
  const csv = await res.text();
  const result = Papa.parse(csv, { header: false, skipEmptyLines: true });
  const rows = result.data as string[][];
  return rows.slice(1).filter(r => r[0]?.trim()).map(row => ({
    namaRDTR: row[1] || '',
    provinsi: row[2] || '',
    kabKota: row[3] || '',
    nomorPerda: row[4] || '',
    tahun: row[5] || '',
    keterangan: row[6] || '',
  }));
}

async function fetchDisintegrasi(): Promise<DisintegrasiRecord[]> {
  const res = await fetch(DISINTEGRASI_CSV_URL);
  if (!res.ok) throw new Error('Failed to fetch Disintegrasi data');
  const csv = await res.text();
  const result = Papa.parse(csv, { header: false, skipEmptyLines: true });
  const rows = result.data as string[][];
  return rows.slice(1).filter(r => r[0]?.trim()).map(row => ({
    namaRDTR: row[1] || '',
    kabKota: row[2] || '',
    provinsi: row[3] || '',
    nomorPerda: row[4] || '',
    tahun: row[5] || '',
    tanggalIntegrasi: row[6] || '',
    tanggalDisintegrasi: row[7] || '',
    keterangan: row[8] || '',
  }));
}

async function fetchLogs(): Promise<LogRecord[]> {
  const res = await fetch(LOGS_CSV_URL);
  if (!res.ok) throw new Error('Failed to fetch Logs data');
  const csv = await res.text();
  const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
  const rows = result.data as Record<string, string>[];
  return rows.filter(r => (r['Tanggal'] || r['tanggal'])?.trim()).map(row => {
    const nilaiLama = (row['Nilai Lama'] || '').trim();
    const nilaiBaru = (row['Nilai Baru'] || '').trim();
    const cluster = (row['Cluster'] || '').trim();

    // Determine impact: prefer cluster rank comparison if both sides reference clusters
    const lamaRank = extractClusterRank(nilaiLama);
    const baruRank = extractClusterRank(nilaiBaru);

    const dampak: LogRecord['dampak'] = computeDampak(nilaiLama, nilaiBaru, lamaRank, baruRank);

    return {
      tanggal: (row['Tanggal'] || '').trim(),
      provinsi: (row['Provinsi'] || '').trim(),
      kabKota: (row['Kab/Kota'] || '').trim(),
      namaRDTR: (row['Nama RDTR'] || '').trim(),
      cluster,
      keterangan: (row['Keterangan'] || '').trim(),
      nilaiLama,
      nilaiBaru,
      dampak,
      clusterLama: lamaRank ?? undefined,
      clusterBaru: baruRank ?? undefined,
    };
  });
}

const KBLI_COLUMNS = [
  { key: 'no', header: 'No', width: '50px', align: 'center' as const },
  { key: 'namaRDTR', header: 'Nama RDTR' },
  { key: 'provinsi', header: 'Provinsi' },
  { key: 'kabKota', header: 'Kab/Kota' },
  { key: 'nomorPerda', header: 'Nomor Perda/Perkada', align: 'center' as const },
  { key: 'tahun', header: 'Tahun', align: 'center' as const },
  { key: 'keterangan', header: 'Keterangan', align: 'center' as const },
];

const DISINTEGRASI_COLUMNS = [
  { key: 'no', header: 'No', width: '50px', align: 'center' as const },
  { key: 'namaRDTR', header: 'Nama RDTR' },
  { key: 'provinsi', header: 'Provinsi' },
  { key: 'kabKota', header: 'Kab/Kota' },
  { key: 'nomorPerda', header: 'Nomor Perda/Perkada', align: 'center' as const },
  { key: 'tahun', header: 'Tahun', align: 'center' as const },
];

function DampakBadge({ dampak }: { dampak: LogRecord['dampak'] }) {
  if (dampak === 'Membaik') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 gap-1">
        <TrendingUp className="h-3 w-3" /> Membaik
      </Badge>
    );
  }
  if (dampak === 'Memburuk') {
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 gap-1">
        <TrendingDown className="h-3 w-3" /> Memburuk
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 gap-1">
      <Minus className="h-3 w-3" /> Stagnan
    </Badge>
  );
}

function LogsTab() {
  const logsQuery = useQuery({
    queryKey: ['perubahan-logs'],
    queryFn: fetchLogs,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const [search, setSearch] = useState('');
  const [filterCluster, setFilterCluster] = useState('all');
  const [activeKPI, setActiveKPI] = useState<string | null>(null);
  const filterDampak = activeKPI ?? 'all';
  const setFilterDampak = (v: string) => setActiveKPI(v === 'all' ? null : v);
  const [selectedRDTR, setSelectedRDTR] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<LogRecord | null>(null);

  const all = logsQuery.data || [];

  const clusterOptions = useMemo(() => {
    const set = new Set<string>();
    all.forEach(l => l.cluster && set.add(l.cluster));
    return Array.from(set).sort();
  }, [all]);

  const filtered = useMemo(() => {
    let result = all.filter(l => {
      if (filterCluster !== 'all' && l.cluster !== filterCluster) return false;
      if (filterDampak !== 'all' && l.dampak !== filterDampak) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!l.namaRDTR.toLowerCase().includes(q) && !l.provinsi.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    // sort by latest date first
    result = [...result].sort((a, b) => parseTanggal(b.tanggal) - parseTanggal(a.tanggal));
    return result;
  }, [all, search, filterCluster, filterDampak]);

  const stats = useMemo(() => ({
    total: all.length,
    membaik: all.filter(l => l.dampak === 'Membaik').length,
    memburuk: all.filter(l => l.dampak === 'Memburuk').length,
    stagnan: all.filter(l => l.dampak === 'Stagnan').length,
  }), [all]);

  const rdtrHistory = useMemo(() => {
    if (!selectedRDTR) return [];
    return all
      .filter(l => l.namaRDTR === selectedRDTR)
      .sort((a, b) => parseTanggal(b.tanggal) - parseTanggal(a.tanggal));
  }, [all, selectedRDTR]);

  if (logsQuery.isLoading) return <LoadingState />;
  if (logsQuery.error) return <div className="text-destructive">Error memuat logs</div>;

  const diffWords = (a: string, b: string): { lama: React.ReactNode; baru: React.ReactNode } => {
    const tokenize = (s: string) => s.split(/(\s+|[,.;:()/\-])/);
    const aTok = tokenize(a || '');
    const bTok = tokenize(b || '');
    const aSet = new Set(aTok.map(t => t.toLowerCase().trim()).filter(Boolean));
    const bSet = new Set(bTok.map(t => t.toLowerCase().trim()).filter(Boolean));
    const renderLama = aTok.map((t, i) => {
      const k = t.toLowerCase().trim();
      if (k && !bSet.has(k)) return <mark key={i} className="bg-red-100 text-red-700 px-0.5 rounded">{t}</mark>;
      return <span key={i}>{t}</span>;
    });
    const renderBaru = bTok.map((t, i) => {
      const k = t.toLowerCase().trim();
      if (k && !aSet.has(k)) return <mark key={i} className="bg-emerald-100 text-emerald-700 px-0.5 rounded">{t}</mark>;
      return <span key={i}>{t}</span>;
    });
    return { lama: renderLama, baru: renderBaru };
  };

  const LOG_COLUMNS = [
    { key: 'no', header: 'No', width: '50px', align: 'center' as const },
    { key: 'tanggal', header: 'Tanggal', width: '130px', align: 'center' as const },
    { key: 'provinsi', header: 'Provinsi', width: '160px' },
    { key: 'kabKota', header: 'Kab/Kota', width: '180px' },
    {
      key: 'namaRDTR',
      header: 'Nama RDTR',
      width: '280px',
      render: (v: unknown, row: Record<string, unknown>) => {
        const r = row as unknown as LogRecord;
        return (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-foreground font-medium cursor-pointer">{String(v)}</span>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs space-y-1">
                <p className="font-semibold text-sm">{r.namaRDTR}</p>
                <p className="text-xs"><span className="text-muted-foreground">Provinsi:</span> {r.provinsi}</p>
                <p className="text-xs"><span className="text-muted-foreground">Kab/Kota:</span> {r.kabKota}</p>
                <p className="text-xs"><span className="text-muted-foreground">Tanggal:</span> {r.tanggal}</p>
                <p className="text-xs"><span className="text-muted-foreground">Cluster:</span> {r.cluster}</p>
                <p className="text-xs"><span className="text-muted-foreground">Dampak:</span> {r.dampak}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    { key: 'cluster', header: 'Cluster', width: '120px', align: 'center' as const },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Summary - Interactive Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: 'all', label: 'Total Logs', value: stats.total, Icon: FileText, bg: 'bg-primary/10', iconColor: 'text-primary', valueColor: 'text-foreground' },
          { key: 'Membaik', label: 'Membaik', value: stats.membaik, Icon: TrendingUp, bg: 'bg-emerald-100', iconColor: 'text-emerald-600', valueColor: 'text-emerald-600' },
          { key: 'Memburuk', label: 'Memburuk', value: stats.memburuk, Icon: TrendingDown, bg: 'bg-red-100', iconColor: 'text-red-600', valueColor: 'text-red-600' },
          { key: 'Stagnan', label: 'Stagnan', value: stats.stagnan, Icon: Minus, bg: 'bg-amber-100', iconColor: 'text-amber-600', valueColor: 'text-amber-600' },
        ].map(c => {
          const active = c.key !== 'all' && activeKPI === c.key;
          return (
            <button
              key={c.key}
              onClick={() => {
                if (c.key === 'all') setActiveKPI(null);
                else setActiveKPI(prev => (prev === c.key ? null : c.key));
              }}
              className={`text-left rounded-lg border bg-card p-4 flex items-center gap-3 transition-all hover:shadow-md ${active ? 'ring-2 ring-primary border-primary shadow-md' : ''}`}
            >
              <div className={`h-10 w-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.Icon className={`h-5 w-5 ${c.iconColor}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className={`text-2xl font-bold ${c.valueColor}`}>{c.value}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari Nama RDTR / Provinsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCluster} onValueChange={setFilterCluster}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Cluster" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Cluster</SelectItem>
            {clusterOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDampak} onValueChange={setFilterDampak}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Dampak Perubahan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Dampak</SelectItem>
            <SelectItem value="Membaik">🟢 Membaik</SelectItem>
            <SelectItem value="Memburuk">🔴 Memburuk</SelectItem>
            <SelectItem value="Stagnan">🟡 Stagnan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filtered as unknown as Record<string, unknown>[]}
        columns={LOG_COLUMNS}
        pageSize={15}
        searchable={false}
        autoNumber
        onRowClick={(row) => setSelectedRow(row as unknown as LogRecord)}
      />

      {/* Detail Drawer */}
      <Sheet open={!!selectedRow} onOpenChange={(o) => !o && setSelectedRow(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">Detail Perubahan</SheetTitle>
          </SheetHeader>
          {selectedRow && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Tanggal</p><p className="font-medium">{selectedRow.tanggal}</p></div>
                <div><p className="text-xs text-muted-foreground">Cluster</p><p className="font-medium">{selectedRow.cluster}</p></div>
                <div><p className="text-xs text-muted-foreground">Provinsi</p><p className="font-medium">{selectedRow.provinsi}</p></div>
                <div><p className="text-xs text-muted-foreground">Kab/Kota</p><p className="font-medium">{selectedRow.kabKota}</p></div>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">Nama RDTR</p>
                <button
                  className="text-sm font-medium text-foreground hover:underline text-left"
                  onClick={() => { setSelectedRDTR(selectedRow.namaRDTR); setSelectedRow(null); }}
                >
                  {selectedRow.namaRDTR}
                </button>
                <p className="text-[10px] text-muted-foreground mt-1">Klik untuk lihat histori lengkap</p>
              </div>
              <div className="border-t pt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Dampak Perubahan</p>
                <DampakBadge dampak={selectedRow.dampak} />
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-1">Keterangan</p>
                <p className="text-sm text-foreground">{selectedRow.keterangan || '-'}</p>
              </div>
              <div className="border-t pt-3 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Nilai Lama</p>
                  <p className="text-sm text-foreground bg-muted/40 border-l-4 border-red-500 rounded p-2.5">{selectedRow.nilaiLama || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Nilai Baru</p>
                  <p className="text-sm text-foreground bg-muted/40 border-l-4 border-emerald-500 rounded p-2.5">{selectedRow.nilaiBaru || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* History Modal */}
      <Dialog open={!!selectedRDTR} onOpenChange={() => setSelectedRDTR(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Histori Perubahan: {selectedRDTR}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {rdtrHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada histori.</p>
            ) : rdtrHistory.map((h, i) => (
              <div key={i} className="border-l-2 border-primary/30 pl-3 py-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{h.tanggal} • {h.cluster}</p>
                  <DampakBadge dampak={h.dampak} />
                </div>
                <p className="text-sm text-foreground">{h.keterangan}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div><span className="font-medium">Lama:</span> {h.nilaiLama || '-'}</div>
                  <div><span className="font-medium">Baru:</span> {h.nilaiBaru || '-'}</div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PerubahanRDTR() {
  const kbliQuery = useQuery({
    queryKey: ['perubahan-kbli'],
    queryFn: fetchKBLI,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const disQuery = useQuery({
    queryKey: ['perubahan-disintegrasi'],
    queryFn: fetchDisintegrasi,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const logsCountQuery = useQuery({
    queryKey: ['perubahan-logs'],
    queryFn: fetchLogs,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const [selectedDis, setSelectedDis] = useState<DisintegrasiRecord | null>(null);

  const kbliData = useMemo(() => kbliQuery.data || [], [kbliQuery.data]);

  const isLoading = kbliQuery.isLoading || disQuery.isLoading;
  const error = kbliQuery.error || disQuery.error;

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-destructive">Error: {(error as Error).message}</div>;

  return (
    <Tabs defaultValue="update-kbli" className="space-y-0 max-w-[1400px] mx-auto">
      <div className="sticky top-0 z-10 bg-background p-4 md:p-6 pb-4 space-y-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold text-foreground">Perubahan RDTR</h2>
          <p className="text-sm text-muted-foreground mt-1">Data Perubahan RDTR</p>
        </div>

        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="update-kbli">RDTR Update KBLI ({kbliData.length})</TabsTrigger>
          <TabsTrigger value="disintegrasi">RDTR Disintegrasi ({disQuery.data?.length || 0})</TabsTrigger>
          <TabsTrigger value="logs">Logs Perubahan RDTR ({logsCountQuery.data?.length || 0})</TabsTrigger>
        </TabsList>
      </div>

      <div className="p-4 md:px-6 space-y-6">
        <TabsContent value="update-kbli" className="mt-4">
          <DataTable
            data={kbliData as unknown as Record<string, unknown>[]}
            columns={KBLI_COLUMNS}
            pageSize={20}
            autoNumber
          />
        </TabsContent>

        <TabsContent value="disintegrasi" className="mt-4">
          <DataTable
            data={(disQuery.data || []) as unknown as Record<string, unknown>[]}
            columns={DISINTEGRASI_COLUMNS}
            pageSize={20}
            autoNumber
            onRowClick={(row) => {
              const record = disQuery.data?.find(r => r.namaRDTR === row.namaRDTR && r.kabKota === row.kabKota);
              if (record) setSelectedDis(record);
            }}
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <LogsTab />
        </TabsContent>
      </div>

      {/* Disintegrasi Detail Dialog */}
      <Dialog open={!!selectedDis} onOpenChange={() => setSelectedDis(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedDis?.namaRDTR}</DialogTitle>
          </DialogHeader>
          {selectedDis && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Provinsi:</span> <span className="font-medium">{selectedDis.provinsi}</span></div>
                <div><span className="text-muted-foreground">Kab/Kota:</span> <span className="font-medium">{selectedDis.kabKota}</span></div>
              </div>
              <div className="border-t pt-3 space-y-2">
                <div className="border-l-2 border-primary/30 pl-3 py-1.5">
                  <p className="text-xs text-muted-foreground">Tanggal Integrasi OSS-RBA</p>
                  <p className="text-sm font-medium text-foreground">{selectedDis.tanggalIntegrasi || '-'}</p>
                </div>
                <div className="border-l-2 border-destructive/30 pl-3 py-1.5">
                  <p className="text-xs text-muted-foreground">Tanggal Disintegrasi</p>
                  <p className="text-sm font-medium text-foreground">{selectedDis.tanggalDisintegrasi || '-'}</p>
                </div>
                <div className="border-l-2 border-muted-foreground/30 pl-3 py-1.5">
                  <p className="text-xs text-muted-foreground">Keterangan</p>
                  <p className="text-sm text-foreground">{selectedDis.keterangan || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
