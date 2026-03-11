import { readJsonFile, writeJsonFile } from "./storage.js";

const seen = new Map<string, number>();
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const MAX_KEYS = 20_000;
const TRIM_COUNT = 2_000;
const FILE = "dedup.json";

const persisted = readJsonFile<Record<string, number>>(FILE, {});
for (const [key, expireAt] of Object.entries(persisted)) {
  if (typeof expireAt === "number") seen.set(key, expireAt);
}

function persist(): void {
  const out: Record<string, number> = {};
  for (const [key, expireAt] of seen.entries()) out[key] = expireAt;
  writeJsonFile(FILE, out);
}

function trimIfNeeded(): void {
  if (seen.size <= MAX_KEYS) return;
  let removed = 0;
  for (const key of seen.keys()) {
    seen.delete(key);
    removed += 1;
    if (removed >= TRIM_COUNT) break;
  }
  persist();
}

function cleanup(now: number, ttlMs: number): void {
  let changed = false;
  for (const [key, expireAt] of seen.entries()) {
    if (expireAt <= now) {
      seen.delete(key);
      changed = true;
    }
  }
  if (changed) persist();
}

export function buildDedupKey(params: { accountId: string; openId?: string; msgId?: string; event?: string; eventKey?: string; createTime?: string }): string {
  return [params.accountId, params.openId || "-", params.msgId || "-", params.event || "-", params.eventKey || "-", params.createTime || "-"].join(":");
}

export function markIfNew(key: string, ttlMs = DEFAULT_TTL_MS): boolean {
  const now = Date.now();
  cleanup(now, ttlMs);
  const expireAt = seen.get(key);
  if (expireAt && expireAt > now) return false;
  seen.set(key, now + ttlMs);
  trimIfNeeded();
  persist();
  return true;
}
