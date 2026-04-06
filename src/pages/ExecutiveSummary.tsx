import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMainData } from '@/hooks/useRDTRData';
import { getKPIData, getSebaranPerProvinsi, getTimelineData } from '@/lib/data-service';
import { KPICard } from '@/components/dashboard/KPICard';
import { IndonesiaMap } from '@/components/dashboard/IndonesiaMap';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { FileStack, CheckCircle, XCircle, ClipboardList, BarChart3 } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const REPORT_CATEGORIES = [
  { label: 'RDTR Menunggu Jadwal Uji Coba Integrasi', match: 'menunggu jadwal uji coba', reportFilter: 'menunggu-jadwal' },
  { label: 'RDTR Belum Mengirim Surat Pernyataan', match: 'belum mengirimkan surat pernyataan', reportFilter: 'belum-surat' },
  { label: 'RDTR Sudah Mengirim Surat Pernyataan', match: 'sudah mengirimkan surat pernyataan', reportFilter: 'sudah-surat' },
  { label: 'RDTR Sudah dilakukan Uji Coba Integrasi Namun Terdapat Kendala Substansi', match: 'kendala substansi', reportFilter: 'kendala-substansi' },
  { label: 'RDTR Sudah Dilakukan Uji Coba Namun Ada Kendala Teknis', match: 'kendala teknis', reportFilter: 'kendala-teknis' },
  { label: 'Permintaan Pemda Untuk Penundaan Uji Coba Integrasi OSS', match: 'penundaan uji coba', reportFilter: 'penundaan' },
  { label: 'RDTR Menunggu Kesepakatan Id-Wilayah', match: 'kesepakatan id-wilayah', reportFilter: 'id-wilayah' },
];

export default function ExecutiveSummary() {
  const { data, isLoading, error } = useMainData();
  const navigate = useNavigate();

  const kpi = useMemo(() => data ? getKPIData(data) : null, [data]);
  const provinsiData = useMemo(() => data ? getSebaranPerProvinsi(data) : [], [data]);
  const timelineData = useMemo(() => data ? getTimelineData(data) : [], [data]);

  const terintegrasiPerProvinsi = useMemo(() => {
    if (!data) return new Map<string, number>();
    const m = new Map<string, number>();
    data.forEach(r => {
      if (!r.provinsi) return;
      if (r.cluster === 'G' && (r.keterangan || '').toLowerCase().includes('integrasi oss')) {
        m.set(r.provinsi, (m.get(r.provinsi) || 0) + 1);
      }
    });
    return m;
  }, [data]);

  const clusterFReport = useMemo(() => {
    if (!data) return [];
    const clusterF = data.filter(r => r.cluster === 'F');
    return REPORT_CATEGORIES.map(cat => {
      const count = clusterF.filter(r => {
        const ket = (r.keterangan || '').toLowerCase();
        return ket.includes(cat.match);
      }).length;
      return { ...cat, jumlah: count };
    });
  }, [data]);

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-destructive">Error loading data: {error.message}</div>;
  if (!kpi) return null;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="sticky top-0 z-10 bg-background p-4 md:p-6 pb-4 space-y-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold text-foreground">Executive Summary</h2>
          <p className="text-sm text-muted-foreground mt-1">Ringkasan data RDTR nasional</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard title="Total RDTR" value={kpi.totalRDTR} icon={FileStack} gradient="blue" linkTo="/data-rdtr?view=total" />
          <KPICard title="RDTR Terintegrasi" value={kpi.totalTerintegrasi} icon={CheckCircle} gradient="emerald" linkTo="/data-rdtr?view=terintegrasi" />
          <KPICard title="RDTR Belum Terintegrasi" value={kpi.totalBelumTerintegrasi} icon={XCircle} gradient="orange" linkTo="/data-rdtr?view=belum" />
        </div>
      </div>

      <div className="p-4 md:px-6 space-y-6">

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
            <button
              key={idx}
              onClick={() => navigate(`/report?filter=${item.reportFilter}`)}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 hover:bg-muted/60 transition-colors cursor-pointer text-left"
            >
              <span className="text-sm text-foreground leading-tight">{item.label}</span>
              <span className="text-lg font-bold text-foreground flex-shrink-0">{item.jumlah}</span>
            </button>
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
        <IndonesiaMap
          data={provinsiData}
          mode="total"
          terintegrasiData={terintegrasiPerProvinsi}
          onProvinceClick={(provinsi) => navigate(`/data-rdtr?provinsi=${encodeURIComponent(provinsi)}`)}
        />
      </div>
      </div>
    </div>
  );
}
