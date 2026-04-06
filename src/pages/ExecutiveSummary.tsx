import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMainData } from '@/hooks/useRDTRData';
import { getSebaranPerProvinsi, getTimelineData } from '@/lib/data-service';
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

  const kpi = useMemo(() => {
    if (!data) return null;
    const totalRDTR = data.length;
    // Terintegrasi = cluster G with "Integrasi OSS"
    const totalTerintegrasi = data.filter(r => r.cluster === 'G' && (r.keterangan || '').toLowerCase().includes('integrasi oss')).length;
    const totalBelumTerintegrasi = totalRDTR - totalTerintegrasi;
    return { totalRDTR, totalTerintegrasi, totalBelumTerintegrasi };
  }, [data]);
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

  const CLUSTER_STATUS_TABLE = [
    { cluster: 'A1', keterangan: 'PERMOHONAN REKOMENDASI REVISI', pic: 'Pemerintah Daerah', fasilitator: 'Direktorat Bina Perencanaan Tata Ruang Daerah Wilayah I\nDirektorat Bina Perencanaan Tata Ruang Daerah Wilayah II' },
    { cluster: 'A2', keterangan: 'SUDAH MENDAPATKAN REKOMENDASI REVISI ATAU SEDANG REVISI', pic: 'Pemerintah Daerah', fasilitator: 'Direktorat Bina Perencanaan Tata Ruang Daerah Wilayah I\nDirektorat Bina Perencanaan Tata Ruang Daerah Wilayah II' },
    { cluster: 'B', keterangan: 'DI HOLD DAERAH', pic: 'Pemerintah Daerah', fasilitator: 'Direktorat Bina Perencanaan Tata Ruang Daerah Wilayah I\nDirektorat Bina Perencanaan Tata Ruang Daerah Wilayah II' },
    { cluster: 'C', keterangan: 'RDTR TIDAK SINKRON', pic: 'Pemerintah Daerah', fasilitator: 'Direktorat Bina Perencanaan Tata Ruang Daerah Wilayah I\nDirektorat Bina Perencanaan Tata Ruang Daerah Wilayah II' },
    { cluster: 'D', keterangan: 'RDTR YANG BELUM MEMENUHI 4 DOKUMEN WAJIB', pic: 'Pemerintah Daerah', fasilitator: 'Direktorat Bina Perencanaan Tata Ruang Daerah Wilayah I\nPokja Data dan Informasi\nPokja Studio Peta' },
    { cluster: 'E', keterangan: 'RDTR PROSES UJI TITIK PASCA PERKADA OLEH PEMERINTAH DAERAH', pic: 'Pemerintah Daerah', fasilitator: 'Direktorat Bina Perencanaan Tata Ruang Daerah Wilayah I\nPokja Data dan Informasi\nPokja Studio Peta' },
    { cluster: 'F', keterangan: 'RDTR YANG SIAP TERINTEGRASI OSS', pic: 'Pemerintah Daerah', fasilitator: 'Kementerian Investasi dan Hilirisasi/BKPM\nPokja Data dan Informasi\nDirektorat Bina Perencanaan Tata Ruang Daerah Wilayah I\nDirektorat Bina Perencanaan Tata Ruang Daerah Wilayah II' },
    { cluster: 'G', keterangan: 'RDTR TERINTEGRASI OSS', pic: 'Pemerintah Daerah', fasilitator: 'Kementerian Investasi dan Hilirisasi/BKPM\nPokja Data dan Informasi\nDirektorat Bina Perencanaan Tata Ruang Daerah Wilayah I\nDirektorat Bina Perencanaan Tata Ruang Daerah Wilayah II' },
    { cluster: 'H', keterangan: 'RDTR DI MINTA TAKEOUT DARI SISTEM OSS OLEH PEMERINTAH DAERAH', pic: 'Pemerintah Daerah', fasilitator: 'Kementerian Investasi dan Hilirisasi/BKPM\nPokja Data dan Informasi\nDirektorat Bina Perencanaan Tata Ruang Daerah Wilayah I\nDirektorat Bina Perencanaan Tata Ruang Daerah Wilayah II' },
  ];

  const clusterCounts = useMemo(() => {
    if (!data) return new Map<string, number>();
    const m = new Map<string, number>();
    data.forEach(r => {
      if (!r.cluster) return;
      // Handle A1/A2 special case
      const c = r.cluster.trim();
      m.set(c, (m.get(c) || 0) + 1);
    });
    return m;
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

      {/* Rekapitulasi Status RDTR Perda */}
      <div className="bg-card rounded-xl card-shadow p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="kpi-gradient-blue rounded-lg p-2.5">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Rekapitulasi Status RDTR Perda</h3>
            <p className="text-xs text-muted-foreground">Ringkasan status RDTR berdasarkan cluster</p>
          </div>
        </div>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-center px-3 py-2.5 font-semibold text-foreground">CLUSTER</th>
                <th className="text-center px-3 py-2.5 font-semibold text-foreground">JUMLAH</th>
                <th className="text-left px-3 py-2.5 font-semibold text-foreground">KETERANGAN</th>
                <th className="text-center px-3 py-2.5 font-semibold text-foreground">PIC</th>
                <th className="text-left px-3 py-2.5 font-semibold text-foreground">FASILITATOR</th>
              </tr>
            </thead>
            <tbody>
              {CLUSTER_STATUS_TABLE.map((row) => (
                <tr key={row.cluster} className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/data-rdtr?cluster=${encodeURIComponent(row.cluster)}`)}>
                  <td className="px-3 py-2.5 text-center font-bold text-foreground">{row.cluster}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-foreground">{clusterCounts.get(row.cluster) || 0}</td>
                  <td className="px-3 py-2.5 text-foreground">{row.keterangan}</td>
                  <td className="px-3 py-2.5 text-center text-foreground">{row.pic}</td>
                  <td className="px-3 py-2.5 text-foreground text-xs whitespace-pre-line">{row.fasilitator}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
