const STORAGE_KEY = 'etsyranker.history.v1';
const MAX_STORED_SNAPSHOTS = 1000;

export interface HistorySnapshot {
  keyword: string;
  timestamp: number;
  score: number;
  searchVolumeLabel: string;
  competitionLabel: string;
}

function readAll(): HistorySnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(snapshots: HistorySnapshot[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  } catch {
    // Storage unavailable (private browsing, quota exceeded) — history just won't persist.
  }
}

export function recordSnapshot(entry: HistorySnapshot): void {
  const all = readAll();
  all.push(entry);
  writeAll(all.slice(-MAX_STORED_SNAPSHOTS));
}

export function getHistory(): HistorySnapshot[] {
  return readAll();
}

export function clearHistory(): void {
  writeAll([]);
}

export function removeKeywordHistory(keyword: string): void {
  writeAll(readAll().filter((s) => s.keyword.toLowerCase() !== keyword.toLowerCase()));
}

export function groupByKeyword(snapshots: HistorySnapshot[]): Map<string, HistorySnapshot[]> {
  const map = new Map<string, HistorySnapshot[]>();
  for (const snapshot of snapshots) {
    const key = snapshot.keyword.toLowerCase();
    const existing = map.get(key);
    if (existing) existing.push(snapshot);
    else map.set(key, [snapshot]);
  }
  for (const group of map.values()) group.sort((a, b) => a.timestamp - b.timestamp);
  return map;
}
