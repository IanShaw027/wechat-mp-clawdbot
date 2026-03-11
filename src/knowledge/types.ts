export type KnowledgeMode = "local" | "external" | "hybrid";
export type KnowledgeProviderType = "local" | "dify" | "milvus";

export interface KnowledgeSearchResult {
  title?: string;
  content: string;
  source?: string;
  score?: number;
}

export interface KnowledgeProviderConfig {
  type: KnowledgeProviderType;
  enabled?: boolean;
  name?: string;
  [key: string]: unknown;
}

export interface KnowledgeProvider {
  type: KnowledgeProviderType;
  healthCheck(config: KnowledgeProviderConfig): Promise<{ ok: boolean; message?: string }>;
  search(query: string, config: KnowledgeProviderConfig): Promise<KnowledgeSearchResult[]>;
}
