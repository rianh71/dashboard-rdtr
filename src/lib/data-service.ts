import Papa from 'papaparse';

export interface RDTRRecord {
  no: number;
  wilayah: string;
  pulau: string;
  provinsi: string;
  kabKota: string;
  namaRDTR: string;
  nomorPerda: string;
  tahun: number;
  cluster: string;
  tanggalIntegrasi: string;
  keterangan: string;
  unggahData1: string;
  unggahData2: string;
  unggahData3: string;
  unggahData4: string;
  unggahMandiriSpasial: string;
  unggahMandiriDBPZ: string;
}

export interface MonitoringRecord {
  no: number;
  wilayah: string;
  provinsi: string;
  kabKota: string;
  namaRDTR: string;
  nomorPerda: string;
  tahun: number;
  [key: string]: string | number;
}

const MAIN_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQeIrj4GVySc_qb7AZn0zSOrAANiUfznnqETodldfUVPDkLE4nGNEMTwuC2HMKLk3Zha35g307Xabhr/pub?output=csv';

const CLUSTER_D_URL = 'https://docs.google.com/spreadsheets/d/1gqcEuNNxfG2bJMz-3D3xzUJmRpwRkZeoJCnOhKVo7xo/gviz/tq?tqx=out:csv&gid=1664512706';
const CLUSTER_E_URL = 'https://docs.google.com/spreadsheets/d/1gqcEuNNxfG2bJMz-3D3xzUJmRpwRkZeoJCnOhKVo7xo/gviz/tq?tqx=out:csv&gid=120567424';
const CLUSTER_F_URL = 'https://docs.google.com/spreadsheets/d/1gqcEuNNxfG2bJMz-3D3xzUJmRpwRkZeoJCnOhKVo7xo/gviz/tq?tqx=out:csv&gid=2069785756';

async function fetchCSV(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
  return res.text();
}

function parseMainCSV(csv: string): RDTRRecord[] {
  const result = Papa.parse(csv, { header: false, skipEmptyLines: true });
  const rows = result.data as string[][];
  // Skip header row
  return rows.slice(1).map((row) => ({
    no: parseInt(row[0]) || 0,
    wilayah: row[1] || '',
    pulau: row[2] || '',
    provinsi: row[3] || '',
    kabKota: row[4] || '',
    namaRDTR: row[5] || '',
    nomorPerda: row[6] || '',
    tahun: parseInt(row[7]) || 0,
    cluster: row[8] || '',
    tanggalIntegrasi: row[9] || '',
    keterangan: row[10] || '',
    unggahData1: row[11] || '',
    unggahData2: row[12] || '',
    unggahData3: row[13] || '',
    unggahData4: row[14] || '',
    unggahMandiriSpasial: row[15] || '',
    unggahMandiriDBPZ: row[16] || '',
  })).filter(r => r.no > 0);
}

function parseMonitoringCSV(csv: string): MonitoringRecord[] {
  const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
  return (result.data as Record<string, string>[]).map((row, idx) => {
    const record: MonitoringRecord = {
      no: parseInt(row['No'] || row['no'] || '') || (idx + 1),
      wilayah: row['Wilayah'] || '',
      provinsi: row['Provinsi'] || '',
      kabKota: row['Kab/Kota'] || '',
      namaRDTR: row['Nama RDTR'] || '',
      nomorPerda: row['Nomer Perda/Perkada'] || '',
      tahun: parseInt(row['Tahun'] || '') || 0,
    };
    // Add remaining columns dynamically
    Object.keys(row).forEach(key => {
      if (!['No', 'Wilayah', 'Provinsi', 'Kab/Kota', 'Nama RDTR', 'Nomer Perda/Perkada', 'Tahun'].includes(key)) {
        record[key] = row[key] || '';
      }
    });
    return record;
  }).filter(r => r.no > 0);
}

export async function fetchMainData(): Promise<RDTRRecord[]> {
  const csv = await fetchCSV(MAIN_CSV_URL);
  return parseMainCSV(csv);
}

export async function fetchClusterD(): Promise<MonitoringRecord[]> {
  const csv = await fetchCSV(CLUSTER_D_URL);
  return parseMonitoringCSV(csv);
}

export async function fetchClusterE(): Promise<MonitoringRecord[]> {
  const csv = await fetchCSV(CLUSTER_E_URL);
  return parseMonitoringCSV(csv);
}

export async function fetchClusterF(): Promise<MonitoringRecord[]> {
  const csv = await fetchCSV(CLUSTER_F_URL);
  return parseMonitoringCSV(csv);
}

// Analytics helpers
export function getKPIData(data: RDTRRecord[]) {
  const totalRDTR = data.length;
  const terintegrasi = data.filter(r => r.tanggalIntegrasi && r.tanggalIntegrasi !== 'Belum Terintegrasi');
  const belumTerintegrasi = data.filter(r => !r.tanggalIntegrasi || r.tanggalIntegrasi === 'Belum Terintegrasi');
  const provinsiSet = new Set(data.map(r => r.provinsi).filter(Boolean));

  return {
    totalRDTR,
    totalTerintegrasi: terintegrasi.length,
    totalBelumTerintegrasi: belumTerintegrasi.length,
    totalProvinsi: provinsiSet.size,
  };
}

export function getSebaranPerProvinsi(data: RDTRRecord[]) {
  const map = new Map<string, { total: number; terintegrasi: number }>();
  data.forEach(r => {
    if (!r.provinsi) return;
    const entry = map.get(r.provinsi) || { total: 0, terintegrasi: 0 };
    entry.total++;
    if (r.tanggalIntegrasi && r.tanggalIntegrasi !== 'Belum Terintegrasi') entry.terintegrasi++;
    map.set(r.provinsi, entry);
  });
  return Array.from(map.entries()).map(([provinsi, data]) => ({
    provinsi,
    ...data,
  })).sort((a, b) => b.total - a.total);
}

export function getSebaranPerPulau(data: RDTRRecord[]) {
  const map = new Map<string, number>();
  data.forEach(r => {
    if (!r.pulau) return;
    map.set(r.pulau, (map.get(r.pulau) || 0) + 1);
  });
  return Array.from(map.entries()).map(([pulau, jumlah]) => ({
    pulau,
    jumlah,
  })).sort((a, b) => b.jumlah - a.jumlah);
}

export function getTimelineData(data: RDTRRecord[]) {
  // Parse integration dates to get year, accumulate
  const yearMap = new Map<number, number>();
  data.forEach(r => {
    if (r.tanggalIntegrasi && r.tanggalIntegrasi !== 'Belum Terintegrasi') {
      // Try to extract year from date string
      const match = r.tanggalIntegrasi.match(/(\d{4})/);
      if (match) {
        const year = parseInt(match[1]);
        yearMap.set(year, (yearMap.get(year) || 0) + 1);
      }
    }
  });

  const years = Array.from(yearMap.keys()).sort();
  let cumulative = 0;
  return years.map(year => {
    cumulative += yearMap.get(year) || 0;
    return {
      tahun: year.toString(),
      jumlahTerintegrasi: cumulative,
      penambahan: yearMap.get(year) || 0,
    };
  });
}

export function getClusterDistribution(data: RDTRRecord[]) {
  const map = new Map<string, number>();
  data.forEach(r => {
    if (!r.cluster) return;
    map.set(r.cluster, (map.get(r.cluster) || 0) + 1);
  });
  return Array.from(map.entries()).map(([cluster, jumlah]) => ({
    cluster,
    jumlah,
  })).sort((a, b) => a.cluster.localeCompare(b.cluster));
}
