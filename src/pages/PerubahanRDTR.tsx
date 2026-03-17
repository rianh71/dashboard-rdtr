import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/dashboard/DataTable';
import Papa from 'papaparse';

const PERUBAHAN_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQiS6A2y56_CL25P0t3FGMzStmHmF7u2i0oilA876uZ22UiZccPbLyN7mwgWbJAVg/pub?output=csv';

interface PerubahanRecord {
  no: string;
  namaRDTR: string;
  kabKota: string;
  provinsi: string;
  nomorPerda: string;
  tahun: string;
  tanggalIntegrasi: string;
  updateKBLI1: string;
  updateKBLI2: string;
  updateKBLI3: string;
  updateKBLI4: string;
  statusRDTR: string;
  wilayah: string;
  dirubahMenjadi: string;
}

async function fetchPerubahanData(): Promise<PerubahanRecord[]> {
  const res = await fetch(PERUBAHAN_CSV_URL);
  if (!res.ok) throw new Error('Failed to fetch perubahan data');
  const csv = await res.text();
  const result = Papa.parse(csv, { header: false, skipEmptyLines: true });
  const rows = result.data as string[][];
  return rows.slice(1).map(row => ({
    no: row[0] || '',
    namaRDTR: row[1] || '',
    kabKota: row[2] || '',
    provinsi: row[3] || '',
    nomorPerda: row[4] || '',
    tahun: row[5] || '',
    tanggalIntegrasi: row[6] || '',
    updateKBLI1: row[7] || '',
    updateKBLI2: row[8] || '',
    updateKBLI3: row[9] || '',
    updateKBLI4: row[10] || '',
    statusRDTR: row[11] || '',
    wilayah: row[12] || '',
    dirubahMenjadi: row[13] || '',
  })).filter(r => r.no && r.no !== '');
}

const DISINTEGRASI_COLUMNS = [
  { key: 'no', header: 'No', width: '50px' },
  { key: 'namaRDTR', header: 'Nama RDTR' },
  { key: 'kabKota', header: 'Kab/Kota' },
  { key: 'provinsi', header: 'Provinsi' },
  { key: 'nomorPerda', header: 'Nomor Perda' },
  { key: 'statusRDTR', header: 'Status RDTR' },
  { key: 'dirubahMenjadi', header: 'Dirubah Menjadi' },
];

export default function PerubahanRDTR() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['perubahan-rdtr'],
    queryFn: fetchPerubahanData,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const [selectedKBLI, setSelectedKBLI] = useState<PerubahanRecord | null>(null);
  const [kbliSearch, setKbliSearch] = useState('');
  const [kbliPage, setKbliPage] = useState(0);
  const kbliPageSize = 20;

  // KBLI: filter, deduplicate by namaRDTR
  const updateKBLIData = useMemo(() => {
    if (!data) return [];
    const kbliRecords = data.filter(r => r.updateKBLI1 || r.updateKBLI2 || r.updateKBLI3 || r.updateKBLI4);
    // Deduplicate by namaRDTR - keep first occurrence
    const seen = new Set<string>();
    return kbliRecords.filter(r => {
      const key = r.namaRDTR.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data]);

  const filteredKBLI = useMemo(() => {
    if (!kbliSearch) return updateKBLIData;
    const q = kbliSearch.toLowerCase();
    return updateKBLIData.filter(r =>
      r.namaRDTR.toLowerCase().includes(q) || r.kabKota.toLowerCase().includes(q) || r.provinsi.toLowerCase().includes(q)
    );
  }, [updateKBLIData, kbliSearch]);

  const kbliTotalPages = Math.ceil(filteredKBLI.length / kbliPageSize);
  const kbliPaged = filteredKBLI.slice(kbliPage * kbliPageSize, (kbliPage + 1) * kbliPageSize);

  // Disintegrasi: filter only records with dirubahMenjadi
  const disintegrasiData = useMemo(() => {
    if (!data) return [];
    return data.filter(r => r.dirubahMenjadi);
  }, [data]);

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-destructive">Error: {(error as Error).message}</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-xl font-bold text-foreground">Perubahan RDTR</h2>
        <p className="text-sm text-muted-foreground mt-1">Data perubahan KBLI dan Disintegrasi RDTR</p>
      </div>

      <Tabs defaultValue="update-kbli" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="update-kbli">RDTR Update KBLI ({updateKBLIData.length})</TabsTrigger>
          <TabsTrigger value="disintegrasi">RDTR Disintegrasi ({disintegrasiData.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="update-kbli" className="mt-4 space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari RDTR..." value={kbliSearch} onChange={e => { setKbliSearch(e.target.value); setKbliPage(0); }} className="pl-9" />
          </div>

          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground w-12">No</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground">Nama RDTR</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground">Kab/Kota</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground">Provinsi</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground">Nomor Perda</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground w-16">Tahun</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground w-20">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {kbliPaged.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada data</td></tr>
                ) : kbliPaged.map((r, idx) => (
                  <tr key={idx} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 text-foreground">{kbliPage * kbliPageSize + idx + 1}</td>
                    <td className="px-3 py-2 text-foreground font-medium">{r.namaRDTR}</td>
                    <td className="px-3 py-2 text-foreground">{r.kabKota}</td>
                    <td className="px-3 py-2 text-foreground">{r.provinsi}</td>
                    <td className="px-3 py-2 text-foreground">{r.nomorPerda}</td>
                    <td className="px-3 py-2 text-foreground">{r.tahun}</td>
                    <td className="px-3 py-2">
                      <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setSelectedKBLI(r)}>
                        <Eye className="h-3 w-3" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {kbliTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {kbliPage * kbliPageSize + 1}-{Math.min((kbliPage + 1) * kbliPageSize, filteredKBLI.length)} dari {filteredKBLI.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setKbliPage(p => p - 1)} disabled={kbliPage === 0}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <span className="text-xs text-muted-foreground px-2">{kbliPage + 1} / {kbliTotalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setKbliPage(p => p + 1)} disabled={kbliPage >= kbliTotalPages - 1}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="disintegrasi" className="mt-4">
          <DataTable
            data={disintegrasiData as unknown as Record<string, unknown>[]}
            columns={DISINTEGRASI_COLUMNS}
            pageSize={20}
            autoNumber
          />
        </TabsContent>
      </Tabs>

      {/* KBLI Detail Dialog */}
      <Dialog open={!!selectedKBLI} onOpenChange={() => setSelectedKBLI(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedKBLI?.namaRDTR}</DialogTitle>
          </DialogHeader>
          {selectedKBLI && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Kab/Kota:</span> <span className="font-medium">{selectedKBLI.kabKota}</span></div>
                <div><span className="text-muted-foreground">Provinsi:</span> <span className="font-medium">{selectedKBLI.provinsi}</span></div>
                <div><span className="text-muted-foreground">Tahun:</span> <span className="font-medium">{selectedKBLI.tahun}</span></div>
                <div><span className="text-muted-foreground">Nomor Perda:</span> <span className="font-medium">{selectedKBLI.nomorPerda}</span></div>
              </div>
              <div className="border-t pt-3 space-y-2">
                <h4 className="font-semibold text-foreground text-sm">Status Update KBLI</h4>
                {selectedKBLI.updateKBLI1 && <div className="text-sm border-l-2 border-primary/30 pl-3 py-1"><span className="text-muted-foreground">Update 1:</span> {selectedKBLI.updateKBLI1}</div>}
                {selectedKBLI.updateKBLI2 && <div className="text-sm border-l-2 border-primary/30 pl-3 py-1"><span className="text-muted-foreground">Update 2:</span> {selectedKBLI.updateKBLI2}</div>}
                {selectedKBLI.updateKBLI3 && <div className="text-sm border-l-2 border-primary/30 pl-3 py-1"><span className="text-muted-foreground">Update 3:</span> {selectedKBLI.updateKBLI3}</div>}
                {selectedKBLI.updateKBLI4 && <div className="text-sm border-l-2 border-primary/30 pl-3 py-1"><span className="text-muted-foreground">Update 4:</span> {selectedKBLI.updateKBLI4}</div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
