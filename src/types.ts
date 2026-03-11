export type WempDmPolicy = "pairing" | "allowlist" | "open" | "disabled";

export interface WempDmConfig {
  policy?: WempDmPolicy;
  allowFrom?: string[];
}

export interface WempRoutingConfig {
  pairedAgent?: string;
  unpairedAgent?: string;
}

export interface WempKnowledgeProviderConfig {
  type: "local" | "dify" | "milvus";
  enabled?: boolean;
  name?: string;
  baseUrl?: string;
  apiKey?: string;
  datasetId?: string;
  endpoint?: string;
  token?: string;
  database?: string;
  collection?: string;
  [key: string]: unknown;
}

export interface WempKnowledgeConfig {
  mode?: "local" | "external" | "hybrid";
  providers?: WempKnowledgeProviderConfig[];
}

export interface WempMenuItem {
  name: string;
  type: "click" | "view";
  key?: string;
  url?: string;
}

export interface WempRouteGuardConfig {
  enabled?: boolean;
  unpairedAllowedAgents?: string[];
}

export interface WempHandoffTicketWebhookConfig {
  enabled?: boolean;
  endpoint?: string;
  token?: string;
  events?: Array<"activated" | "resumed">;
}

export interface WempFeatureFlags {
  menu?: { enabled?: boolean; items?: WempMenuItem[] };
  assistantToggle?: { enabled?: boolean; defaultEnabled?: boolean };
  usageLimit?: { enabled?: boolean; dailyMessages?: number; dailyTokens?: number; exemptPaired?: boolean };
  routeGuard?: WempRouteGuardConfig;
  handoff?: {
    enabled?: boolean;
    contact?: string;
    message?: string;
    autoResumeMinutes?: number;
    activeReply?: string;
    ticketWebhook?: WempHandoffTicketWebhookConfig;
  };
  welcome?: { enabled?: boolean; subscribeText?: string };
}

export type ResolvedWempFeatureFlags = Omit<Required<WempFeatureFlags>, "routeGuard"> & {
  routeGuard?: WempRouteGuardConfig;
};

export interface WempAccountConfig {
  enabled?: boolean;
  name?: string;
  appId?: string;
  appSecret?: string;
  token?: string;
  encodingAESKey?: string;
  webhookPath?: string;
  requireHttps?: boolean;
  dm?: WempDmConfig;
  routing?: WempRoutingConfig;
  knowledge?: WempKnowledgeConfig;
}

export interface WempChannelConfig extends WempAccountConfig {
  defaultAccount?: string;
  accounts?: Record<string, WempAccountConfig>;
  features?: WempFeatureFlags;
}

export interface ResolvedWempAccount {
  accountId: string;
  enabled: boolean;
  configured: boolean;
  name?: string;
  appId: string;
  appSecret: string;
  token: string;
  encodingAESKey?: string;
  webhookPath: string;
  requireHttps?: boolean;
  dm: Required<WempDmConfig>;
  routing: Required<WempRoutingConfig>;
  knowledge: Required<WempKnowledgeConfig>;
  features: ResolvedWempFeatureFlags;
  config: WempAccountConfig;
}

export interface WempRuntimeSnapshot {
  accountId: string;
  running: boolean;
  connected: boolean;
  lastConnectedAt: number | null;
  lastInboundAt: number | null;
  lastOutboundAt: number | null;
  lastError: string | null;
}

export interface WempScaffoldAnswers {
  brandName: string;
  audience: string;
  services: string;
  contact: string;
  escalationRules: string;
  tone: string;
  template: "enterprise" | "content" | "general";
}
