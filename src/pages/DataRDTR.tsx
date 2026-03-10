import { useMemo, useState } from 'react';
import { useMainData } from '@/hooks/useRDTRData';
import { getSebaranPerProvinsi, getSebaranPerPulau } from '@/lib/data-service';
import { DataTable } from '@/components/dashboard/DataTable';
import { IndonesiaMap } from '@/components/dashboard/IndonesiaMap';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { exportToExcel, exportToPDF } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#2962FF', '#00897B', '#F57C00', '#7B1FA2', '#C62828', '#00838F', '#558B2F', '#6D4C41'];

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
  const [filterPulau, setFilterPulau] = useState('all');
  const [filterProvinsi, setFilterProvinsi] = useState('all');
  const [filterCluster, setFilterCluster] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWilayah, setFilterWilayah] = useState('all');
  const [activeTab, setActiveTab] = useState<'table' | 'analytics'>('table');

  const wilayahOptions = useMemo(() => data ? [...new Set(data.map(r => r.wilayah).filter(Boolean))].sort() : [], [data]);
  const pulauOptions = useMemo(() => data ? [...new Set(data.map(r => r.pulau).filter(Boolean))].sort() : [], [data]);
  const provinsiOptions = useMemo(() => data ? [...new Set(data.map(r => r.provinsi).filter(Boolean))].sort() : [], [data]);
  const clusterOptions = useMemo(() => data ? [...new Set(data.map(r => r.cluster).filter(Boolean))].sort() : [], [data]);

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
  }, [data, filterPulau, filterProvinsi, filterCluster, filterStatus]);

  const provinsiData = useMemo(() => data ? getSebaranPerProvinsi(data) : [], [data]);
  const pulauData = useMemo(() => data ? getSebaranPerPulau(data) : [], [data]);

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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Data RDTR</h2>
          <p className="text-sm text-muted-foreground mt-1">Database lengkap RDTR Nasional</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('table')}
          >
            Tabel Data
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('analytics')}
          >
            Sebaran Analytics
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
            <div className="w-32">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Cluster</label>
              <Select value={filterCluster} onValueChange={setFilterCluster}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {clusterOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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

          <DataTable
            data={filtered as unknown as Record<string, unknown>[]}
            columns={MAIN_COLUMNS}
            pageSize={20}
          />
        </>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Sebaran per Provinsi Table + Map */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl card-shadow p-5">
              <h3 className="font-semibold text-foreground mb-4">Sebaran RDTR per Provinsi</h3>
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
                      <tr key={p.provinsi} className="border-b last:border-b-0 hover:bg-muted/30">
                        <td className="py-1.5 px-2 text-foreground">{p.provinsi}</td>
                        <td className="py-1.5 px-2 text-right font-medium text-foreground">{p.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-card rounded-xl card-shadow p-5">
              <h3 className="font-semibold text-foreground mb-4">Peta Sebaran RDTR</h3>
              <IndonesiaMap data={provinsiData} mode="total" />
            </div>
          </div>

          {/* Terintegrasi per Provinsi */}
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
                      <tr key={p.provinsi} className="border-b last:border-b-0 hover:bg-muted/30">
                        <td className="py-1.5 px-2 text-foreground">{p.provinsi}</td>
                        <td className="py-1.5 px-2 text-right font-medium text-accent">{p.terintegrasi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-card rounded-xl card-shadow p-5">
              <h3 className="font-semibold text-foreground mb-4">Peta RDTR Terintegrasi</h3>
              <IndonesiaMap data={provinsiData} mode="terintegrasi" />
            </div>
          </div>

          {/* Sebaran per Pulau */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl card-shadow p-5">
              <h3 className="font-semibold text-foreground mb-4">Sebaran RDTR per Pulau</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-semibold text-foreground">Pulau</th>
                    <th className="text-right py-2 px-2 font-semibold text-foreground">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {pulauData.map(p => (
                    <tr key={p.pulau} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="py-1.5 px-2 text-foreground">{p.pulau}</td>
                      <td className="py-1.5 px-2 text-right font-medium text-foreground">{p.jumlah}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-card rounded-xl card-shadow p-5">
              <h3 className="font-semibold text-foreground mb-4">Sebaran RDTR per Pulau</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pulauData} dataKey="jumlah" nameKey="pulau" cx="50%" cy="50%" outerRadius={100} label={(entry) => `${entry.pulau}: ${entry.jumlah}`} labelLine fontSize={11}>
                    {pulauData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
