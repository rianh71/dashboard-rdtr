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
  terintegrasiData?: Map<string, number>;
  onProvinceClick?: (provinsi: string) => void;
  onPulauClick?: (pulau: string) => void;
}

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

function getPulauColor(pulau: string): string {
  if (!pulau) return '#e2e8f0';
  // Normalize: check partial matches for "Bali" or "Nusa Tenggara"
  for (const [key, color] of Object.entries(PULAU_COLORS)) {
    if (pulau.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(pulau.toLowerCase())) {
      return color;
    }
  }
  return '#e2e8f0';
}

export function IndonesiaMap({ data, mode = 'total', pulauData, provinceToPulau, pulauMode = false, terintegrasiData, onProvinceClick, onPulauClick }: IndonesiaMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const callbacksRef = useRef({ onProvinceClick, onPulauClick });
  callbacksRef.current = { onProvinceClick, onPulauClick };

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
      scrollWheelZoom: false,
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
              return {
                fillColor: getPulauColor(pulau),
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
          onEachFeature: (feature, featureLayer) => {
            const name = normalizeProvince(feature?.properties?.PROVINSI || '');
            if (pulauMode && provinceToPulau) {
              const pulau = provinceToPulau.get(name) || 'Tidak diketahui';
              const jumlah = pulauMap.get(pulau) || 0;
              featureLayer.bindTooltip(
                `<div style="background:transparent;border:none;box-shadow:none;padding:0;">
                  <div class="text-xs font-semibold">${pulau}</div>
                  <div class="text-xs">${name}</div>
                  <div class="text-xs">Total RDTR: <b>${jumlah}</b></div>
                </div>`,
                { sticky: true, className: 'leaflet-tooltip-custom', direction: 'top', offset: [0, -10] }
              );
              featureLayer.on('click', () => {
                callbacksRef.current.onPulauClick?.(pulau);
              });
            } else {
              const d = dataMap.get(name);
              const total = d?.total ?? 0;
              const terintegrasi = d?.terintegrasi ?? 0;
              const clusterGCount = terintegrasiData?.get(name) ?? 0;
              const terintegrasiLine = terintegrasiData
                ? `<div class="text-xs">RDTR Terintegrasi: <b>${clusterGCount}</b></div>`
                : '';
              const tooltipContent = mode === 'total'
                ? `<div style="background:transparent;border:none;box-shadow:none;padding:0;">
                    <div class="text-xs font-semibold">${name}</div>
                    <div class="text-xs">Total RDTR: <b>${total}</b></div>
                    ${terintegrasiLine}
                  </div>`
                : `<div style="background:transparent;border:none;box-shadow:none;padding:0;">
                    <div class="text-xs font-semibold">${name}</div>
                    <div class="text-xs">Total Terintegrasi: <b>${terintegrasi}</b></div>
                    ${terintegrasiLine}
                  </div>`;
              featureLayer.bindTooltip(tooltipContent, {
                sticky: true,
                className: 'leaflet-tooltip-custom',
                direction: 'top',
                offset: [0, -10],
              });
              featureLayer.on('click', () => {
                callbacksRef.current.onProvinceClick?.(name);
              });
            }
            (featureLayer as L.Path).on('mouseover', function () {
              (this as L.Path).setStyle({ weight: 3, color: '#2962FF', fillOpacity: 0.9 });
            });
            (featureLayer as L.Path).on('mouseout', function () {
              (this as L.Path).setStyle({ weight: 1, color: '#94a3b8', fillOpacity: 0.8 });
            });
          },
        });
        layer.addTo(map);
        geoLayerRef.current = layer;
      });
  }, [dataMap, maxVal, mode, pulauMode, provinceToPulau, pulauMap, terintegrasiData]);

  return (
    <div className="relative w-full" style={{ zIndex: 0 }}>
      <div ref={mapContainerRef} className="w-full rounded-lg overflow-hidden cursor-pointer" style={{ height: 400, position: 'relative', zIndex: 0 }} />
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
