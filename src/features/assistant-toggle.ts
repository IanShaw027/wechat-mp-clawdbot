import { readJsonFile, writeJsonFile } from "../storage.js";
import { mkdirSync } from "node:fs";
import * as path from "node:path";

const LEGACY_FILE = "assistant-toggle.json";
const ACCOUNT_DIR = "assistant-toggle";
const DATA_ROOT = "/root/clawd/projects/wemp-v2/.data";
const ACCOUNT_ROOT = path.join(DATA_ROOT, ACCOUNT_DIR);

const legacyState = readJsonFile<Record<string, unknown>>(LEGACY_FILE, {});
const stateByOpenId = new Map<string, boolean>();

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function legacyAccountFile(accountId: string): string {
  return `${ACCOUNT_DIR}/${encodeURIComponent(accountId)}.json`;
}

function ensureAccountRoot(): void {
  mkdirSync(ACCOUNT_ROOT, { recursive: true });
}

function ensureOpenIdDir(accountId: string): void {
  mkdirSync(path.join(ACCOUNT_ROOT, encodePathSegment(accountId)), { recursive: true });
}

function openIdFile(accountId: string, openId: string): string {
  return `${ACCOUNT_DIR}/${encodePathSegment(accountId)}/${encodePathSegment(openId)}.json`;
}

function cacheKey(accountId: string, openId: string): string {
  return `${accountId}\u0000${openId}`;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readOpenIdState(accountId: string, openId: string): boolean | undefined {
  const persisted = readJsonFile<unknown>(openIdFile(accountId, openId), null);
  return asBoolean(persisted);
}

function readLegacyAccountState(accountId: string, openId: string): boolean | undefined {
  const state = readJsonFile<Record<string, unknown>>(legacyAccountFile(accountId), {});
  return asBoolean(state[openId]);
}

function readLegacyAggregatedState(accountId: string, openId: string): boolean | undefined {
  return asBoolean(legacyState[`${accountId}:${openId}`]);
}

function persistOpenIdState(accountId: string, openId: string, enabled: boolean): void {
  ensureOpenIdDir(accountId);
  writeJsonFile(openIdFile(accountId, openId), enabled);
}

function persistLegacyAccountState(accountId: string, openId: string, enabled: boolean): void {
  ensureAccountRoot();
  const previous = readJsonFile<Record<string, unknown>>(legacyAccountFile(accountId), {});
  const next: Record<string, boolean> = {};
  for (const [id, value] of Object.entries(previous)) {
    if (typeof value === "boolean") next[id] = value;
  }
  next[openId] = enabled;
  writeJsonFile(legacyAccountFile(accountId), next);
}

function loadOpenIdState(accountId: string, openId: string): boolean {
  const key = cacheKey(accountId, openId);
  const cached = stateByOpenId.get(key);
  if (cached !== undefined) return cached;

  const isolated = readOpenIdState(accountId, openId);
  if (isolated !== undefined) {
    stateByOpenId.set(key, isolated);
    return isolated;
  }

  const legacyAccount = readLegacyAccountState(accountId, openId);
  if (legacyAccount !== undefined) {
    persistOpenIdState(accountId, openId, legacyAccount);
    stateByOpenId.set(key, legacyAccount);
    return legacyAccount;
  }

  const legacyAggregated = readLegacyAggregatedState(accountId, openId);
  if (legacyAggregated !== undefined) {
    persistOpenIdState(accountId, openId, legacyAggregated);
    persistLegacyAccountState(accountId, openId, legacyAggregated);
    stateByOpenId.set(key, legacyAggregated);
    return legacyAggregated;
  }

  stateByOpenId.set(key, false);
  return false;
}

export function isAssistantEnabled(accountId: string, openId: string): boolean {
  return loadOpenIdState(accountId, openId);
}

export function setAssistantEnabled(accountId: string, openId: string, enabled: boolean): void {
  stateByOpenId.set(cacheKey(accountId, openId), enabled);
  persistOpenIdState(accountId, openId, enabled);
  persistLegacyAccountState(accountId, openId, enabled);
}
