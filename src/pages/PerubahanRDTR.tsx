import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { DataTable } from '@/components/dashboard/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Papa from 'papaparse';

const BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vST7goQce4BhG1s50o2MF_rEvZFiHFPdkoY5Kqql00euIAylRApG9EagCjbbqGNBI_QLD6c0pD8_EV2/pub';
const KBLI_CSV_URL = `${BASE_URL}?gid=0&single=true&output=csv`;
const DISINTEGRASI_CSV_URL = `${BASE_URL}?gid=1838633116&single=true&output=csv`;

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

const KBLI_COLUMNS = [
  { key: 'no', header: 'No', width: '50px', align: 'center' as const },
  { key: 'namaRDTR', header: 'Nama RDTR' },
  { key: 'provinsi', header: 'Provinsi' },
  { key: 'kabKota', header: 'Kab/Kota' },
  { key: 'nomorPerda', header: 'Nomor Perda/Perkada' },
  { key: 'tahun', header: 'Tahun', align: 'center' as const },
  { key: 'keterangan', header: 'Keterangan', align: 'center' as const },
];

const DISINTEGRASI_COLUMNS = [
  { key: 'no', header: 'No', width: '50px', align: 'center' as const },
  { key: 'namaRDTR', header: 'Nama RDTR' },
  { key: 'provinsi', header: 'Provinsi' },
  { key: 'kabKota', header: 'Kab/Kota' },
  { key: 'nomorPerda', header: 'Nomor Perda/Perkada' },
  { key: 'tahun', header: 'Tahun', align: 'center' as const },
];

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

  const [selectedDis, setSelectedDis] = useState<DisintegrasiRecord | null>(null);

  // Deduplicate KBLI by namaRDTR
  const kbliData = useMemo(() => {
    if (!kbliQuery.data) return [];
    const seen = new Set<string>();
    return kbliQuery.data.filter(r => {
      const key = r.namaRDTR.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [kbliQuery.data]);

  const isLoading = kbliQuery.isLoading || disQuery.isLoading;
  const error = kbliQuery.error || disQuery.error;

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-destructive">Error: {(error as Error).message}</div>;

  return (
    <Tabs defaultValue="update-kbli" className="space-y-0 max-w-[1400px] mx-auto">
      <div className="sticky top-0 z-10 bg-background p-4 md:p-6 pb-4 space-y-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold text-foreground">Perubahan RDTR</h2>
          <p className="text-sm text-muted-foreground mt-1">Data perubahan KBLI dan Disintegrasi RDTR</p>
        </div>

        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="update-kbli">RDTR Update KBLI ({kbliData.length})</TabsTrigger>
          <TabsTrigger value="disintegrasi">RDTR Disintegrasi ({disQuery.data?.length || 0})</TabsTrigger>
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
