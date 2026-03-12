import { useMemo } from 'react';
import { useMainData } from '@/hooks/useRDTRData';
import { getKPIData, getSebaranPerProvinsi, getSebaranPerPulau, getTimelineData } from '@/lib/data-service';
import { KPICard } from '@/components/dashboard/KPICard';
import { IndonesiaMap } from '@/components/dashboard/IndonesiaMap';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { FileStack, CheckCircle, XCircle, Globe, Map, Layers, ClipboardList } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const REPORT_CATEGORIES = [
  'RDTR Menunggu Jadwal Uji Coba Integrasi',
  'RDTR Menunggu Release Note (RDTR Belum Mengirimkan Surat Pernyataan)',
  'RDTR Sudah dilakukan Uji Coba Integrasi Namun Terdapat Kendala Substansi',
  'RDTR Sudah Dilakukan Uji Coba Namun Ada Kendala Teknis',
  'Permintaan Pemda Untuk Penundaan Uji Coba Integrasi OSS',
  'RDTR Menunggu Kesepakatan Id-Wilayah',
];

const COLORS = ['#2962FF', '#00897B', '#F57C00', '#7B1FA2', '#C62828', '#00838F', '#558B2F', '#6D4C41'];

export default function ExecutiveSummary() {
  const { data, isLoading, error } = useMainData();

  const kpi = useMemo(() => data ? getKPIData(data) : null, [data]);
  const provinsiData = useMemo(() => data ? getSebaranPerProvinsi(data) : [], [data]);
  const pulauData = useMemo(() => data ? getSebaranPerPulau(data) : [], [data]);
  const timelineData = useMemo(() => data ? getTimelineData(data) : [], [data]);

  const clusterFReport = useMemo(() => {
    if (!data) return [];
    const clusterF = data.filter(r => r.cluster === 'F');
    return REPORT_CATEGORIES.map(cat => {
      const count = clusterF.filter(r => r.keterangan && r.keterangan.trim().toLowerCase().includes(cat.toLowerCase().slice(0, 20))).length;
      return { kategori: cat, jumlah: count };
    });
  }, [data]);

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-destructive">Error loading data: {error.message}</div>;
  if (!kpi) return null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-xl font-bold text-foreground">Executive Summary</h2>
        <p className="text-sm text-muted-foreground mt-1">Ringkasan data RDTR nasional</p>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Total RDTR" value={kpi.totalRDTR} icon={FileStack} gradient="blue" linkTo="/data-rdtr" />
        <KPICard title="RDTR Terintegrasi" value={kpi.totalTerintegrasi} icon={CheckCircle} gradient="emerald" linkTo="/data-rdtr?status=terintegrasi" />
        <KPICard title="RDTR Belum Terintegrasi" value={kpi.totalBelumTerintegrasi} icon={XCircle} gradient="orange" linkTo="/data-rdtr?status=belum" />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="RDTR per Provinsi" value={provinsiData.length} icon={Globe} gradient="blue" subtitle="Provinsi unik" linkTo="/data-rdtr?tab=analytics" />
        <KPICard title="RDTR Terintegrasi per Provinsi" value={provinsiData.filter(p => p.terintegrasi > 0).length} icon={Map} gradient="emerald" subtitle="Provinsi" linkTo="/data-rdtr?tab=analytics" />
        <KPICard title="RDTR per Pulau" value={pulauData.length} icon={Layers} gradient="orange" subtitle="Pulau/Wilayah" linkTo="/data-rdtr?tab=analytics" />
      </div>

      {/* Report KPI - Cluster F */}
      <div className="bg-card rounded-xl card-shadow p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="kpi-gradient-purple rounded-lg p-2.5">
            <ClipboardList className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Rekap Report Darat RDTR Cluster F</h3>
            <p className="text-xs text-muted-foreground">Rincian keterangan RDTR Cluster F</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clusterFReport.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <span className="text-sm text-foreground leading-tight">{item.kategori}</span>
              <span className="text-lg font-bold text-foreground flex-shrink-0">{item.jumlah}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl card-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4">Timeline RDTR Terintegrasi per Tahun</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 92%)" />
              <XAxis dataKey="tahun" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(0, 0%, 100%)', border: '1px solid hsl(214, 20%, 92%)', borderRadius: '8px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="jumlahTerintegrasi" stroke="#2962FF" strokeWidth={2.5} dot={{ r: 4, fill: '#2962FF' }} name="Kumulatif" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl card-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4">Penambahan RDTR Terintegrasi per Tahun</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 92%)" />
              <XAxis dataKey="tahun" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(0, 0%, 100%)', border: '1px solid hsl(214, 20%, 92%)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="penambahan" fill="#00897B" radius={[4, 4, 0, 0]} name="Penambahan" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Indonesia Map */}
      <div className="bg-card rounded-xl card-shadow p-5">
        <h3 className="font-semibold text-foreground mb-4">Peta Sebaran RDTR per Provinsi</h3>
        <IndonesiaMap data={provinsiData} mode="total" />
      </div>

      {/* Pie Chart - Sebaran per Pulau */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl card-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4">Sebaran RDTR per Pulau</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pulauData} dataKey="jumlah" nameKey="pulau" cx="50%" cy="50%" outerRadius={100} label={(entry) => `${entry.pulau}: ${entry.jumlah}`} labelLine={true} fontSize={11}>
                {pulauData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl card-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4">Top 15 Provinsi - Jumlah RDTR</h3>
          <div className="overflow-y-auto max-h-[300px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-semibold text-foreground">Provinsi</th>
                  <th className="text-right py-2 px-2 font-semibold text-foreground">Total</th>
                  <th className="text-right py-2 px-2 font-semibold text-foreground">Terintegrasi</th>
                </tr>
              </thead>
              <tbody>
                {provinsiData.slice(0, 15).map((p) => (
                  <tr key={p.provinsi} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="py-1.5 px-2 text-foreground">{p.provinsi}</td>
                    <td className="py-1.5 px-2 text-right font-medium text-foreground">{p.total}</td>
                    <td className="py-1.5 px-2 text-right font-medium text-accent">{p.terintegrasi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
