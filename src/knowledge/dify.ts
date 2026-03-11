import type { KnowledgeProvider, KnowledgeProviderConfig, KnowledgeSearchResult } from "./types.js";

function assertConfig(config: KnowledgeProviderConfig): { baseUrl: string; apiKey: string; datasetId?: string } {
  const baseUrl = String(config.baseUrl || "").trim();
  const apiKey = String(config.apiKey || "").trim();
  const datasetId = config.datasetId ? String(config.datasetId) : undefined;
  if (!baseUrl || !apiKey) throw new Error("dify config missing baseUrl/apiKey");
  return { baseUrl, apiKey, datasetId };
}

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

export const difyKnowledgeProvider: KnowledgeProvider = {
  type: "dify",
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
      const { baseUrl, apiKey, datasetId } = assertConfig(config);
      const url = new URL("/v1/datasets/retrieval", baseUrl).toString();
      const timeoutMs = Number(config.timeoutMs || 6000);
      const retries = Number(config.retries || 1);
      const res = await fetchWithRetry(
        url,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            query,
            dataset_id: datasetId,
            top_k: 5,
          }),
        },
        Number.isFinite(retries) ? Math.max(0, Math.floor(retries)) : 1,
        Number.isFinite(timeoutMs) ? Math.max(1000, Math.floor(timeoutMs)) : 6000,
      );
      if (!res.ok) return [{ title: "dify-error", content: `dify http ${res.status}`, source: "dify" }];
      const data = await res.json() as any;
      const records = Array.isArray(data?.records) ? data.records : Array.isArray(data?.data) ? data.data : [];
      return records.map((item: any, index: number) => ({
        title: item?.title || item?.segment?.document?.name || `dify-${index + 1}`,
        content: item?.content || item?.segment?.content || JSON.stringify(item),
        source: "dify",
        score: typeof item?.score === "number" ? item.score : undefined,
      }));
    } catch (error) {
      return [{
        title: "dify-error",
        content: error instanceof Error ? error.message : String(error),
        source: "dify",
      }];
    }
  },
};
