import type { FlatSettings } from "./types";

export function childPath(prefix: string, key: string): string {
  return prefix ? `${prefix}.${key}` : key;
}

export function entryPath(path: string, storageIndex: number): string {
  return `${path}[${storageIndex}]`;
}

export function storedIndices(values: FlatSettings, path: string, kind: "rule-list" | "string-list"): number[] {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}\\[(\\d+)\\]${kind === "rule-list" ? "\\." : "$"}`);
  const indices = new Set<number>();
  for (const key of Object.keys(values)) {
    const match = key.match(pattern);
    if (match) {
      const index = Number(match[1]);
      if (Number.isSafeInteger(index)) indices.add(index);
    }
  }
  return [...indices].sort((a, b) => a - b);
}

export function nextStorageIndex<T extends { storageIndex: number }>(
  entries: T[],
  isEmpty: (entry: T) => boolean,
): number {
  const empty = entries.find(isEmpty);
  return empty?.storageIndex ?? Math.max(-1, ...entries.map((entry) => entry.storageIndex)) + 1;
}
