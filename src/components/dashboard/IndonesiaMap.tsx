import { useEffect, useRef, useState } from 'react';

interface ProvinceData {
  provinsi: string;
  total: number;
  terintegrasi: number;
}

interface IndonesiaMapProps {
  data: ProvinceData[];
  mode?: 'total' | 'terintegrasi';
}

// Simplified Indonesia province coordinates for visualization
const PROVINCE_COORDS: Record<string, [number, number]> = {
  'Aceh': [5.55, 95.32],
  'Sumatera Utara': [2.59, 98.71],
  'Sumatera Barat': [-0.74, 100.80],
  'Riau': [0.51, 101.45],
  'Jambi': [-1.61, 103.61],
  'Sumatera Selatan': [-3.32, 104.91],
  'Bengkulu': [-3.80, 102.26],
  'Lampung': [-4.56, 105.41],
  'Bangka Belitung': [-2.74, 106.44],
  'Kepulauan Riau': [1.07, 104.03],
  'DKI Jakarta': [-6.21, 106.85],
  'Jawa Barat': [-6.91, 107.61],
  'Jawa Tengah': [-7.15, 110.14],
  'DI Yogyakarta': [-7.87, 110.43],
  'Jawa Timur': [-7.54, 112.24],
  'Banten': [-6.41, 106.14],
  'Bali': [-8.41, 115.19],
  'Nusa Tenggara Barat': [-8.65, 117.36],
  'Nusa Tenggara Timur': [-8.66, 121.08],
  'Kalimantan Barat': [-0.13, 109.34],
  'Kalimantan Tengah': [-1.49, 113.29],
  'Kalimantan Selatan': [-3.09, 115.25],
  'Kalimantan Timur': [1.17, 116.42],
  'Kalimantan Utara': [3.07, 116.04],
  'Sulawesi Utara': [0.62, 123.97],
  'Sulawesi Tengah': [-1.43, 121.44],
  'Sulawesi Selatan': [-3.67, 119.97],
  'Sulawesi Tenggara': [-4.14, 122.17],
  'Gorontalo': [0.54, 123.06],
  'Sulawesi Barat': [-2.84, 119.23],
  'Maluku': [-3.24, 130.14],
  'Maluku Utara': [1.57, 127.81],
  'Papua': [-4.27, 138.08],
  'Papua Barat': [-1.34, 133.17],
  'Papua Selatan': [-6.50, 139.50],
  'Papua Tengah': [-3.70, 136.50],
  'Papua Pegunungan': [-4.10, 138.90],
  'Papua Barat Daya': [-2.00, 132.00],
};

function getColor(value: number, max: number): string {
  if (value === 0) return 'hsl(210, 20%, 92%)';
  const intensity = Math.min(value / Math.max(max, 1), 1);
  const lightness = 80 - intensity * 45;
  return `hsl(215, 80%, ${lightness}%)`;
}

export function IndonesiaMap({ data, mode = 'total' }: IndonesiaMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const maxVal = Math.max(...data.map(d => mode === 'total' ? d.total : d.terintegrasi), 1);

  // Map bounds for Indonesia
  const minLat = -11, maxLat = 6;
  const minLon = 94, maxLon = 141;
  const width = 800, height = 340;

  function toSVG(lat: number, lon: number): [number, number] {
    const x = ((lon - minLon) / (maxLon - minLon)) * width;
    const y = ((maxLat - lat) / (maxLat - minLat)) * height;
    return [x, y];
  }

  const provinces = data.map(d => {
    const coords = PROVINCE_COORDS[d.provinsi];
    if (!coords) return null;
    const [x, y] = toSVG(coords[0], coords[1]);
    const value = mode === 'total' ? d.total : d.terintegrasi;
    const radius = Math.max(6, Math.min(24, 6 + (value / maxVal) * 18));
    return { ...d, x, y, value, radius };
  }).filter(Boolean);

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        style={{ minHeight: 280 }}
      >
        {/* Background */}
        <rect width={width} height={height} fill="hsl(210, 20%, 98%)" rx="8" />
        
        {/* Province bubbles */}
        {provinces.map((p) => (
          <g key={p!.provinsi}>
            <circle
              cx={p!.x}
              cy={p!.y}
              r={p!.radius}
              fill={getColor(p!.value, maxVal)}
              stroke="hsl(215, 80%, 50%)"
              strokeWidth={1}
              opacity={0.85}
              className="cursor-pointer transition-all duration-200 hover:opacity-100"
              onMouseEnter={(e) => {
                const rect = svgRef.current?.getBoundingClientRect();
                if (rect) {
                  setTooltip({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top - 10,
                    content: `${p!.provinsi}\nTotal RDTR: ${p!.total}\nTerintegrasi: ${p!.terintegrasi}`,
                  });
                }
              }}
              onMouseLeave={() => setTooltip(null)}
            />
            {p!.value > 0 && p!.radius > 10 && (
              <text
                x={p!.x}
                y={p!.y + 4}
                textAnchor="middle"
                fontSize={9}
                fontWeight="bold"
                fill="hsl(215, 80%, 25%)"
                className="pointer-events-none"
              >
                {p!.value}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-foreground text-primary-foreground text-xs rounded-lg px-3 py-2 shadow-lg z-10 whitespace-pre-line"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(210, 20%, 92%)' }} />
          <span>0</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(215, 80%, 65%)' }} />
          <span>Rendah</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(215, 80%, 35%)' }} />
          <span>Tinggi</span>
        </div>
      </div>
    </div>
  );
}
