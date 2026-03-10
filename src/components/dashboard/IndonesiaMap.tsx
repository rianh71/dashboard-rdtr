import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ProvinceData {
  provinsi: string;
  total: number;
  terintegrasi: number;
}

interface PulauData {
  pulau: string;
  jumlah: number;
}

interface IndonesiaMapProps {
  data: ProvinceData[];
  mode?: 'total' | 'terintegrasi';
  pulauData?: PulauData[];
  provinceToPulau?: Map<string, string>;
  pulauMode?: boolean;
}

// Mapping from GeoJSON PROVINSI names to data province names
const PROVINCE_NAME_MAP: Record<string, string> = {
  'Dki Jakarta': 'DKI Jakarta',
  'Di Yogyakarta': 'DI Yogyakarta',
  'Kepulauan Bangka Belitung': 'Bangka Belitung',
};

function normalizeProvince(name: string): string {
  return PROVINCE_NAME_MAP[name] || name;
}

const PULAU_COLORS: Record<string, string> = {
  'Sumatera': '#2962FF',
  'Jawa': '#00897B',
  'Kalimantan': '#F57C00',
  'Sulawesi': '#7B1FA2',
  'Bali dan Nusa Tenggara': '#C62828',
  'Maluku': '#00838F',
  'Papua': '#558B2F',
};

function getColor(value: number, max: number): string {
  if (value === 0) return '#e2e8f0';
  const intensity = Math.min(value / Math.max(max, 1), 1);
  if (intensity < 0.25) return '#93c5fd';
  if (intensity < 0.5) return '#3b82f6';
  if (intensity < 0.75) return '#1d4ed8';
  return '#1e3a8a';
}

function getPulauColor(pulau: string, jumlah: number, maxVal: number): string {
  if (!pulau || jumlah === 0) return '#e2e8f0';
  const baseColor = PULAU_COLORS[pulau] || '#6D4C41';
  return baseColor;
}

export function IndonesiaMap({ data, mode = 'total', pulauData, provinceToPulau, pulauMode = false }: IndonesiaMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);

  const dataMap = useMemo(() => {
    const m = new Map<string, ProvinceData>();
    data.forEach(d => m.set(d.provinsi, d));
    return m;
  }, [data]);

  const pulauMap = useMemo(() => {
    if (!pulauData) return new Map<string, number>();
    const m = new Map<string, number>();
    pulauData.forEach(d => m.set(d.pulau, d.jumlah));
    return m;
  }, [pulauData]);

  const maxVal = useMemo(
    () => pulauMode
      ? Math.max(...(pulauData?.map(d => d.jumlah) || [1]), 1)
      : Math.max(...data.map(d => mode === 'total' ? d.total : d.terintegrasi), 1),
    [data, mode, pulauData, pulauMode]
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-2.5, 118],
      zoom: 5,
      minZoom: 4,
      maxZoom: 8,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
    }

    fetch('/indonesia-provinces.geojson')
      .then(r => r.json())
      .then((geojson) => {
        const layer = L.geoJSON(geojson, {
          style: (feature) => {
            const name = normalizeProvince(feature?.properties?.PROVINSI || '');
            if (pulauMode && provinceToPulau) {
              const pulau = provinceToPulau.get(name) || '';
              const jumlah = pulauMap.get(pulau) || 0;
              return {
                fillColor: getPulauColor(pulau, jumlah, maxVal),
                weight: 1,
                color: '#94a3b8',
                fillOpacity: 0.8,
              };
            }
            const d = dataMap.get(name);
            const value = d ? (mode === 'total' ? d.total : d.terintegrasi) : 0;
            return {
              fillColor: getColor(value, maxVal),
              weight: 1,
              color: '#94a3b8',
              fillOpacity: 0.8,
            };
          },
          onEachFeature: (feature, layer) => {
            const name = normalizeProvince(feature?.properties?.PROVINSI || '');
            if (pulauMode && provinceToPulau) {
              const pulau = provinceToPulau.get(name) || 'Tidak diketahui';
              const jumlah = pulauMap.get(pulau) || 0;
              layer.bindTooltip(
                `<div class="text-xs font-semibold">${pulau}</div>
                 <div class="text-xs">${name}</div>
                 <div class="text-xs">Total RDTR: <b>${jumlah}</b></div>`,
                { sticky: true, className: 'leaflet-tooltip-custom' }
              );
            } else {
              const d = dataMap.get(name);
              const total = d?.total ?? 0;
              const terintegrasi = d?.terintegrasi ?? 0;
              layer.bindTooltip(
                `<div class="text-xs font-semibold">${name}</div>
                 <div class="text-xs">Total RDTR: <b>${total}</b></div>
                 <div class="text-xs">Terintegrasi: <b>${terintegrasi}</b></div>`,
                { sticky: true, className: 'leaflet-tooltip-custom' }
              );
            }
          },
        });
        layer.addTo(map);
        geoLayerRef.current = layer;
      });
  }, [dataMap, maxVal, mode, pulauMode, provinceToPulau, pulauMap]);

  return (
    <div className="relative w-full">
      <div ref={mapContainerRef} className="w-full rounded-lg overflow-hidden" style={{ height: 400 }} />
      {pulauMode ? (
        <div className="flex flex-wrap items-center gap-3 mt-3 justify-center">
          {Object.entries(PULAU_COLORS).map(([pulau, color]) => (
            <div key={pulau} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded" style={{ background: color }} />
              <span>{pulau}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded" style={{ background: '#e2e8f0' }} />
            <span>0</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded" style={{ background: '#93c5fd' }} />
            <span>Rendah</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded" style={{ background: '#3b82f6' }} />
            <span>Sedang</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded" style={{ background: '#1e3a8a' }} />
            <span>Tinggi</span>
          </div>
        </div>
      )}
    </div>
  );
}
