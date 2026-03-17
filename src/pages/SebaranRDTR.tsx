import { useMemo } from 'react';
import { useMainData } from '@/hooks/useRDTRData';
import { getSebaranPerProvinsi, getSebaranPerPulau } from '@/lib/data-service';
import { KPICard } from '@/components/dashboard/KPICard';
import { IndonesiaMap } from '@/components/dashboard/IndonesiaMap';
import { LoadingState } from '@/components/dashboard/LoadingState';
import { Globe, Map, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#2962FF', '#00897B', '#F57C00', '#7B1FA2', '#C62828', '#00838F', '#558B2F', '#6D4C41'];

export default function SebaranRDTR() {
  const { data, isLoading, error } = useMainData();
  const navigate = useNavigate();

  const provinsiData = useMemo(() => data ? getSebaranPerProvinsi(data) : [], [data]);
  const pulauData = useMemo(() => data ? getSebaranPerPulau(data) : [], [data]);

  const provinceToPulau = useMemo(() => {
    if (!data) return new Map();
    const m = new Map();
    data.forEach(r => {
      if (r.provinsi && r.pulau) m.set(r.provinsi, r.pulau);
    });
    return m;
  }, [data]);

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-destructive">Error: {error.message}</div>;

  const handleProvinsiClick = (provinsi: string) => {
    navigate(`/data-rdtr?provinsi=${encodeURIComponent(provinsi)}`);
  };

  const handlePulauClick = (pulau: string) => {
    navigate(`/data-rdtr?pulau=${encodeURIComponent(pulau)}`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-xl font-bold text-foreground">Sebaran RDTR</h2>
        <p className="text-sm text-muted-foreground mt-1">Analisis sebaran RDTR per provinsi dan pulau</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="RDTR per Provinsi" value={provinsiData.length} icon={Globe} gradient="blue" subtitle="Provinsi unik" />
        <KPICard title="RDTR Terintegrasi per Provinsi" value={provinsiData.filter(p => p.terintegrasi > 0).length} icon={Map} gradient="emerald" subtitle="Provinsi" />
        <KPICard title="RDTR per Pulau" value={pulauData.length} icon={Layers} gradient="orange" subtitle="Pulau/Wilayah" />
      </div>

      {/* Analytics Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl card-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4">RDTR per Provinsi</h3>
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
                  <tr key={p.provinsi} className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer" onClick={() => handleProvinsiClick(p.provinsi)}>
                    <td className="py-1.5 px-2 text-primary hover:underline">{p.provinsi}</td>
                    <td className="py-1.5 px-2 text-right font-medium text-foreground">{p.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-card rounded-xl card-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4">Peta RDTR per Provinsi</h3>
          <IndonesiaMap data={provinsiData} mode="total" onProvinceClick={handleProvinsiClick} />
        </div>
      </div>

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
                  <tr key={p.provinsi} className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer" onClick={() => handleProvinsiClick(p.provinsi)}>
                    <td className="py-1.5 px-2 text-primary hover:underline">{p.provinsi}</td>
                    <td className="py-1.5 px-2 text-right font-medium text-accent">{p.terintegrasi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-card rounded-xl card-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4">Peta RDTR Terintegrasi per Provinsi</h3>
          <IndonesiaMap data={provinsiData} mode="terintegrasi" onProvinceClick={handleProvinsiClick} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl card-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4">RDTR per Pulau</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-semibold text-foreground">Pulau</th>
                <th className="text-right py-2 px-2 font-semibold text-foreground">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {pulauData.map(p => (
                <tr key={p.pulau} className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer" onClick={() => handlePulauClick(p.pulau)}>
                  <td className="py-1.5 px-2 text-primary hover:underline">{p.pulau}</td>
                  <td className="py-1.5 px-2 text-right font-medium text-foreground">{p.jumlah}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-card rounded-xl card-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4">Peta RDTR per Pulau</h3>
          <IndonesiaMap data={provinsiData} pulauData={pulauData} provinceToPulau={provinceToPulau} pulauMode={true} onPulauClick={handlePulauClick} />
        </div>
      </div>

      {/* Pie Chart */}
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
