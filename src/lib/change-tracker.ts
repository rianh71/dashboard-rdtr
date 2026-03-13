import { RDTRRecord } from './data-service';

export interface ChangeLogEntry {
  timestamp: string;
  namaRDTR: string;
  kabKota: string;
  provinsi: string;
  field: string;
  oldValue: string;
  newValue: string;
}

const STORAGE_KEY = 'rdtr-change-logs';
const SNAPSHOT_KEY = 'rdtr-data-snapshot';

export function getChangeLogs(): ChangeLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveChangeLogs(logs: ChangeLogEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

function getSnapshot(): Record<string, { cluster: string; keterangan: string }> {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSnapshot(data: RDTRRecord[]) {
  const snapshot: Record<string, { cluster: string; keterangan: string }> = {};
  data.forEach(r => {
    const key = `${r.namaRDTR}__${r.kabKota}`;
    snapshot[key] = { cluster: r.cluster, keterangan: r.keterangan };
  });
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function detectChanges(currentData: RDTRRecord[]): ChangeLogEntry[] {
  const previousSnapshot = getSnapshot();
  const newEntries: ChangeLogEntry[] = [];
  const now = new Date().toISOString();

  if (Object.keys(previousSnapshot).length === 0) {
    // First load - save snapshot, no changes to detect
    saveSnapshot(currentData);
    return [];
  }

  currentData.forEach(r => {
    const key = `${r.namaRDTR}__${r.kabKota}`;
    const prev = previousSnapshot[key];
    if (!prev) return;

    if (prev.cluster && r.cluster && prev.cluster !== r.cluster) {
      newEntries.push({
        timestamp: now,
        namaRDTR: r.namaRDTR,
        kabKota: r.kabKota,
        provinsi: r.provinsi,
        field: 'cluster',
        oldValue: prev.cluster,
        newValue: r.cluster,
      });
    }

    if (prev.keterangan !== r.keterangan && (prev.keterangan || r.keterangan)) {
      newEntries.push({
        timestamp: now,
        namaRDTR: r.namaRDTR,
        kabKota: r.kabKota,
        provinsi: r.provinsi,
        field: 'keterangan',
        oldValue: prev.keterangan || '-',
        newValue: r.keterangan || '-',
      });
    }
  });

  if (newEntries.length > 0) {
    const existingLogs = getChangeLogs();
    const allLogs = [...newEntries, ...existingLogs].slice(0, 500);
    saveChangeLogs(allLogs);
  }

  saveSnapshot(currentData);
  return newEntries;
}

export function getClusterFLogs(): ChangeLogEntry[] {
  const logs = getChangeLogs();
  return logs.filter(l => l.field === 'keterangan');
}
