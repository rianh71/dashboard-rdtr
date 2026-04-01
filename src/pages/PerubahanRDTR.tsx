import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { DataTable } from '@/components/dashboard/DataTable';
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
  }));
}

const KBLI_COLUMNS = [
  { key: 'no', header: 'No', width: '50px', align: 'center' as const },
  { key: 'namaRDTR', header: 'Nama RDTR' },
  { key: 'provinsi', header: 'Provinsi' },
  { key: 'kabKota', header: 'Kab/Kota' },
  { key: 'nomorPerda', header: 'Nomor Perda/Perkada' },
  { key: 'tahun', header: 'Tahun', align: 'center' as const },
  { key: 'keterangan', header: 'Keterangan' },
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
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-xl font-bold text-foreground">Perubahan RDTR</h2>
        <p className="text-sm text-muted-foreground mt-1">Data perubahan KBLI dan Disintegrasi RDTR</p>
      </div>

      <Tabs defaultValue="update-kbli" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="update-kbli">RDTR Update KBLI ({kbliData.length})</TabsTrigger>
          <TabsTrigger value="disintegrasi">RDTR Disintegrasi ({disQuery.data?.length || 0})</TabsTrigger>
        </TabsList>

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
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
