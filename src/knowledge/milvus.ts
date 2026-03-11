import type { KnowledgeProvider, KnowledgeProviderConfig, KnowledgeSearchResult } from "./types.js";

function assertConfig(config: KnowledgeProviderConfig): { endpoint: string; token?: string; collection: string; database?: string } {
  const endpoint = String(config.endpoint || "").trim();
  const collection = String(config.collection || "").trim();
  const token = config.token ? String(config.token) : undefined;
  const database = config.database ? String(config.database) : undefined;
  if (!endpoint || !collection) throw new Error("milvus config missing endpoint/collection");
  return { endpoint, token, collection, database };
}

function parseTopK(value: unknown, fallback = 5): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
}

function parseMinScore(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function parseScore(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const str = asString(value);
    if (str && str.trim().length > 0) return str.trim();
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type MilvusMappedResult = KnowledgeSearchResult & {
  _index: number;
};

async function fetchWithRetry(url: string, init: RequestInit, retries = 1, timeoutMs = 6000): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      lastError = error;
      if (i >= retries) throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("unknown fetch error");
}

export const milvusKnowledgeProvider: KnowledgeProvider = {
  type: "milvus",
  async healthCheck(config: KnowledgeProviderConfig) {
    try {
      assertConfig(config);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }
  },
  async search(query: string, config: KnowledgeProviderConfig): Promise<KnowledgeSearchResult[]> {
    try {
      const { endpoint, token, collection, database } = assertConfig(config);
      const topK = parseTopK(config.topK, 5);
      const minScore = parseMinScore(config.minScore);
      const filterEmptyContent = config.filterEmptyContent !== false;
      const url = new URL("/v2/vectordb/entities/search", endpoint).toString();
      const timeoutMs = Number(config.timeoutMs || 6000);
      const retries = Number(config.retries || 1);
      const res = await fetchWithRetry(
        url,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            collectionName: collection,
            dbName: database,
            data: [query],
            limit: topK,
            outputFields: ["text", "title", "source"],
          }),
        },
        Number.isFinite(retries) ? Math.max(0, Math.floor(retries)) : 1,
        Number.isFinite(timeoutMs) ? Math.max(1000, Math.floor(timeoutMs)) : 6000,
      );
      if (!res.ok) return [{ title: "milvus-error", content: `milvus http ${res.status}`, source: "milvus" }];
      const data = await res.json() as any;
      const rawRecords = Array.isArray(data?.data) ? data.data : [];
      const records = rawRecords.flatMap((item: any) => (Array.isArray(item) ? item : [item]));
      const mapped: MilvusMappedResult[] = records.map((item: any, index: number) => {
        const entity = isRecord(item?.entity) ? item.entity : undefined;
        const content = firstNonEmptyString(entity?.text, item?.text, entity?.content, item?.content) || "";
        return {
          _index: index,
          title: firstNonEmptyString(item?.title, entity?.title) || `milvus-${index + 1}`,
          content,
          source: firstNonEmptyString(item?.source, entity?.source) || "milvus",
          score: parseScore(item?.score ?? entity?.score ?? item?.distance ?? entity?.distance),
        };
      });

      const filtered = mapped.filter((item) => {
        if (filterEmptyContent && item.content.trim().length === 0) return false;
        if (minScore !== undefined) {
          if (typeof item.score !== "number") return false;
          if (item.score < minScore) return false;
        }
        return true;
      });

      filtered.sort((a, b) => {
        const aHasScore = typeof a.score === "number";
        const bHasScore = typeof b.score === "number";
        if (aHasScore && bHasScore && a.score !== b.score) return b.score! - a.score!;
        if (aHasScore !== bHasScore) return aHasScore ? -1 : 1;
        return a._index - b._index;
      });

      return filtered.slice(0, topK).map((item) => ({
        title: item.title,
        content: item.content,
        source: item.source,
        score: item.score,
      }));
    } catch (error) {
      return [{
        title: "milvus-error",
        content: error instanceof Error ? error.message : String(error),
        source: "milvus",
      }];
    }
  },
};
