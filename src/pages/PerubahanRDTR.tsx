import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/dashboard/DataTable';
import { LoadingState } from '@/components/dashboard/LoadingState';
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

const KBLI_COLUMNS = [
  { key: 'no', header: 'No', width: '50px' },
  { key: 'namaRDTR', header: 'Nama RDTR' },
  { key: 'kabKota', header: 'Kab/Kota' },
  { key: 'provinsi', header: 'Provinsi' },
  { key: 'nomorPerda', header: 'Nomor Perda' },
  { key: 'tahun', header: 'Tahun', width: '70px' },
  { key: 'updateKBLI1', header: 'Update KBLI (1)' },
  { key: 'updateKBLI2', header: 'Update KBLI (2)' },
  { key: 'updateKBLI3', header: 'Update KBLI (3)' },
  { key: 'updateKBLI4', header: 'Update KBLI (4)' },
];

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

  const updateKBLIData = useMemo(() => {
    if (!data) return [];
    return data.filter(r => r.updateKBLI1 || r.updateKBLI2 || r.updateKBLI3 || r.updateKBLI4);
  }, [data]);

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
        <TabsContent value="update-kbli" className="mt-4">
          <DataTable
            data={updateKBLIData as unknown as Record<string, unknown>[]}
            columns={KBLI_COLUMNS}
            pageSize={20}
          />
        </TabsContent>
        <TabsContent value="disintegrasi" className="mt-4">
          <DataTable
            data={disintegrasiData as unknown as Record<string, unknown>[]}
            columns={DISINTEGRASI_COLUMNS}
            pageSize={20}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
