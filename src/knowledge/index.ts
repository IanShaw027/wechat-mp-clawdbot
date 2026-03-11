import type { KnowledgeMode, KnowledgeProvider, KnowledgeProviderConfig, KnowledgeSearchResult } from "./types.js";
import { localKnowledgeProvider } from "./local.js";
import { difyKnowledgeProvider } from "./dify.js";
import { milvusKnowledgeProvider } from "./milvus.js";

const providers: Record<string, KnowledgeProvider> = {
  local: localKnowledgeProvider,
  dify: difyKnowledgeProvider,
  milvus: milvusKnowledgeProvider,
};

interface KnowledgeCacheEntry {
  expireAt: number;
  results: KnowledgeSearchResult[];
}

const knowledgeCache = new Map<string, KnowledgeCacheEntry>();
const DEFAULT_CACHE_TTL_MS = 30_000;
const DEFAULT_CACHE_MAX_KEYS = 200;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function cacheTtlMs(): number {
  return parsePositiveInt(process.env.WEMP_KNOWLEDGE_CACHE_TTL_MS, DEFAULT_CACHE_TTL_MS);
}

function cacheMaxKeys(): number {
  return Math.max(1, parsePositiveInt(process.env.WEMP_KNOWLEDGE_CACHE_MAX_KEYS, DEFAULT_CACHE_MAX_KEYS));
}

function cacheKey(query: string, mode: KnowledgeMode, configs: KnowledgeProviderConfig[]): string {
  return JSON.stringify({
    query: String(query || "").trim(),
    mode,
    configs: configs.filter((item) => item.enabled !== false),
  });
}

function readKnowledgeCache(key: string, now = Date.now()): KnowledgeSearchResult[] | null {
  const hit = knowledgeCache.get(key);
  if (!hit) return null;
  if (hit.expireAt <= now) {
    knowledgeCache.delete(key);
    return null;
  }
  return hit.results.map((item) => ({ ...item }));
}

function writeKnowledgeCache(key: string, results: KnowledgeSearchResult[], now = Date.now()): void {
  const ttlMs = cacheTtlMs();
  if (ttlMs <= 0) return;
  const entry: KnowledgeCacheEntry = {
    expireAt: now + ttlMs,
    results: results.map((item) => ({ ...item })),
  };
  knowledgeCache.set(key, entry);
  const maxKeys = cacheMaxKeys();
  while (knowledgeCache.size > maxKeys) {
    const oldestKey = knowledgeCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    knowledgeCache.delete(oldestKey);
  }
}

async function safeSearch(provider: KnowledgeProvider | undefined, query: string, config: KnowledgeProviderConfig): Promise<KnowledgeSearchResult[]> {
  if (!provider) return [];
  try {
    return await provider.search(query, config);
  } catch (error) {
    return [{
      title: `${config.type}-error`,
      content: error instanceof Error ? error.message : String(error),
      source: config.type,
    }];
  }
}

function isErrorPlaceholder(item: KnowledgeSearchResult): boolean {
  const title = String(item.title || "");
  return title.endsWith("-error");
}

export async function searchKnowledge(query: string, mode: KnowledgeMode, configs: KnowledgeProviderConfig[]): Promise<KnowledgeSearchResult[]> {
  const key = cacheKey(query, mode, configs);
  const cached = readKnowledgeCache(key);
  if (cached) return cached;
  const enabled = configs.filter((c) => c.enabled !== false);
  const localConfig = enabled.find((c) => c.type === "local") || { type: "local", enabled: true };
  const external = enabled.filter((c) => c.type !== "local");
  if (mode === "local") {
    const results = await safeSearch(localKnowledgeProvider, query, localConfig);
    writeKnowledgeCache(key, results);
    return results;
  }
  if (mode === "external") {
    const results = await Promise.all(external.map((c) => safeSearch(providers[c.type], query, c)));
    const flattened = results.flat();
    const usable = flattened.filter((item) => !isErrorPlaceholder(item));
    if (usable.length > 0) {
      writeKnowledgeCache(key, flattened);
      return flattened;
    }
    const localFallback = await safeSearch(localKnowledgeProvider, query, localConfig);
    const finalResults = localFallback.length > 0 ? [...flattened, ...localFallback] : flattened;
    writeKnowledgeCache(key, finalResults);
    return finalResults;
  }
  const results = await Promise.all([
    safeSearch(localKnowledgeProvider, query, localConfig),
    ...external.map((c) => safeSearch(providers[c.type], query, c)),
  ]);
  const finalResults = results.flat();
  writeKnowledgeCache(key, finalResults);
  return finalResults;
}
