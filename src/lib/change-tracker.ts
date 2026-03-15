import { RDTRRecord } from './data-service';

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwBdeXyJCZ6LwvNiJhpGKhjjmRrn_yJ9_cTA13_frDYsDfw3btk9Don_s84Ev3WvHWP/exec';
const LOGS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRzIZ_QFz70eFoWUSuykYace85X7HWYh806x7q1KtTsxBYDQiiQCcW8QVVhqGgOTVWekPBBHprFVbpo/pub?output=csv';

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

async function postLogsToGAS(entries: ChangeLogEntry[]) {
  try {
    const payload = entries.map(e => ({
      tanggal: new Date(e.timestamp).toLocaleString('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
      namaRDTR: e.namaRDTR,
      kabKota: e.kabKota,
      provinsi: e.provinsi,
      cluster: e.field === 'cluster' ? `${e.oldValue} → ${e.newValue}` : '',
      keterangan: e.field === 'keterangan' ? `${e.oldValue} → ${e.newValue}` : '',
      nilaiLama: e.oldValue,
      nilaiBaru: e.newValue,
    }));

    await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
    console.log(`[ChangeTracker] ${entries.length} logs sent to Google Sheets`);
  } catch (err) {
    console.warn('[ChangeTracker] Failed to post logs to GAS:', err);
  }
}

export function detectChanges(currentData: RDTRRecord[]): ChangeLogEntry[] {
  const previousSnapshot = getSnapshot();
  const newEntries: ChangeLogEntry[] = [];
  const now = new Date().toISOString();

  if (Object.keys(previousSnapshot).length === 0) {
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

    // Auto-send to Google Sheets
    postLogsToGAS(newEntries);
  }

  saveSnapshot(currentData);
  return newEntries;
}

export function getClusterFLogs(): ChangeLogEntry[] {
  const logs = getChangeLogs();
  return logs.filter(l => l.field === 'keterangan');
}
