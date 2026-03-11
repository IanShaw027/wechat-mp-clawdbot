import { existsSync, mkdirSync } from "node:fs";
import * as path from "node:path";
import { readJsonFile, writeJsonFile } from "../storage.js";

const LEGACY_FILE = "usage-limit.json";
const ACCOUNT_DIR = "usage-limit";
const DATA_ROOT = "/root/clawd/projects/wemp-v2/.data";
const ACCOUNT_ROOT = path.join(DATA_ROOT, ACCOUNT_DIR);

type UsageRecord = { messages: number; tokens: number; day: string };

const usageByAccount = new Map<string, Map<string, UsageRecord>>();
const migratedLegacyAccounts = new Set<string>();
const legacyUsage = readJsonFile<Record<string, UsageRecord>>(LEGACY_FILE, {});

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function sanitizeLegacyAccountId(accountId: string): string {
  return accountId.replaceAll("/", "_").replaceAll("\\", "_");
}

function accountDir(accountId: string): string {
  return `${ACCOUNT_DIR}/${encodePathSegment(accountId)}`;
}

function usageFile(accountId: string, openId: string): string {
  return `${accountDir(accountId)}/${encodePathSegment(openId)}.json`;
}

function usageFilePath(accountId: string, openId: string): string {
  return path.join(DATA_ROOT, usageFile(accountId, openId));
}

function legacyAccountFiles(accountId: string): string[] {
  return [...new Set([
    `${ACCOUNT_DIR}/${sanitizeLegacyAccountId(accountId)}.json`,
    `${ACCOUNT_DIR}/${encodePathSegment(accountId)}.json`,
  ])];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureAccountDir(accountId: string): void {
  mkdirSync(path.join(ACCOUNT_ROOT, encodePathSegment(accountId)), { recursive: true });
}

function isUsageRecord(value: unknown): value is UsageRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<UsageRecord>;
  return Number.isFinite(record.messages) && Number.isFinite(record.tokens) && typeof record.day === "string";
}

function getAccountUsage(accountId: string): Map<string, UsageRecord> {
  const cached = usageByAccount.get(accountId);
  if (cached) return cached;
  const next = new Map<string, UsageRecord>();
  usageByAccount.set(accountId, next);
  return next;
}

function readUsageFromIsolatedFile(accountId: string, openId: string): UsageRecord | undefined {
  const record = readJsonFile<UsageRecord | null>(usageFile(accountId, openId), null);
  if (isUsageRecord(record)) return record;
  return undefined;
}

function persistUsage(accountId: string, openId: string, record: UsageRecord): void {
  ensureAccountDir(accountId);
  writeJsonFile(usageFile(accountId, openId), record);
}

function migrateLegacyAccountFile(accountId: string, accountUsage: Map<string, UsageRecord>): void {
  if (migratedLegacyAccounts.has(accountId)) return;
  migratedLegacyAccounts.add(accountId);

  for (const legacyFile of legacyAccountFiles(accountId)) {
    const legacyAccountUsage = readJsonFile<Record<string, unknown>>(legacyFile, {});
    for (const [openId, record] of Object.entries(legacyAccountUsage)) {
      if (!openId || accountUsage.has(openId)) continue;
      const isolatedRecord = readUsageFromIsolatedFile(accountId, openId);
      if (isolatedRecord) {
        accountUsage.set(openId, isolatedRecord);
        continue;
      }
      if (!isUsageRecord(record)) continue;
      accountUsage.set(openId, record);
      if (!existsSync(usageFilePath(accountId, openId))) {
        persistUsage(accountId, openId, record);
      }
    }
  }
}

function migrateLegacyGlobalRecord(accountId: string, openId: string, accountUsage: Map<string, UsageRecord>): UsageRecord | undefined {
  const legacyRecord = legacyUsage[`${accountId}:${openId}`];
  if (!isUsageRecord(legacyRecord)) return undefined;
  accountUsage.set(openId, legacyRecord);
  persistUsage(accountId, openId, legacyRecord);
  return legacyRecord;
}

function loadUsage(accountId: string, openId: string): UsageRecord | undefined {
  const accountUsage = getAccountUsage(accountId);
  const cached = accountUsage.get(openId);
  if (cached) return cached;

  const isolatedRecord = readUsageFromIsolatedFile(accountId, openId);
  if (isolatedRecord) {
    accountUsage.set(openId, isolatedRecord);
    return isolatedRecord;
  }

  migrateLegacyAccountFile(accountId, accountUsage);
  const legacyAccountRecord = accountUsage.get(openId);
  if (legacyAccountRecord) return legacyAccountRecord;

  return migrateLegacyGlobalRecord(accountId, openId, accountUsage);
}

function normalizeRecord(record?: UsageRecord): UsageRecord {
  const day = today();
  if (!record || record.day !== day) return { messages: 0, tokens: 0, day };
  return record;
}

export function recordUsage(accountId: string, openId: string, messageTokens = 0): void {
  const accountUsage = getAccountUsage(accountId);
  const prev = normalizeRecord(loadUsage(accountId, openId));
  const next = {
    day: prev.day,
    messages: prev.messages + 1,
    tokens: prev.tokens + Math.max(0, messageTokens),
  };
  accountUsage.set(openId, next);
  persistUsage(accountId, openId, next);
}

export function getUsage(accountId: string, openId: string): UsageRecord {
  return normalizeRecord(loadUsage(accountId, openId));
}

export function isUsageExceeded(accountId: string, openId: string, limits: { dailyMessages?: number; dailyTokens?: number }): boolean {
  const current = getUsage(accountId, openId);
  if ((limits.dailyMessages || 0) > 0 && current.messages >= (limits.dailyMessages || 0)) return true;
  if ((limits.dailyTokens || 0) > 0 && current.tokens >= (limits.dailyTokens || 0)) return true;
  return false;
}
