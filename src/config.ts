import type {
  WempAccountConfig,
  WempChannelConfig,
  WempHandoffTicketWebhookConfig,
  WempKnowledgeConfig,
  ResolvedWempAccount,
} from "./types.js";
import Ajv from "ajv";
import type { ErrorObject, ValidateFunction } from "ajv";
import { wempConfigSchema } from "./config-schema.js";

const DEFAULT_ACCOUNT_ID = "default";
const DEFAULT_WEBHOOK_PATH = "/wemp";
let wempSchemaValidator: ValidateFunction<WempChannelConfig> | null = null;

function decodeJsonPointerToken(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

function pointerToPath(pointer: string): string {
  const parts = String(pointer || "")
    .split("/")
    .filter(Boolean)
    .map(decodeJsonPointerToken);
  return parts.length ? `channels.wemp.${parts.join(".")}` : "channels.wemp";
}

function resolveSchemaField(error: ErrorObject): string {
  if (error.keyword === "required") {
    const missingProperty = String((error.params as { missingProperty?: unknown }).missingProperty || "").trim();
    const basePath = pointerToPath(error.instancePath || "");
    return missingProperty ? `${basePath}.${missingProperty}` : basePath;
  }
  if (error.keyword === "additionalProperties") {
    const extraProperty = String((error.params as { additionalProperty?: unknown }).additionalProperty || "").trim();
    const basePath = pointerToPath(error.instancePath || "");
    return extraProperty ? `${basePath}.${extraProperty}` : basePath;
  }
  return pointerToPath(error.instancePath || "");
}

function resolveSchemaFix(error: ErrorObject, field: string): string {
  if (error.keyword === "required") return `set ${field}`;
  if (error.keyword === "additionalProperties") return `remove unsupported field ${field}`;
  if (error.keyword === "type") {
    const expectedType = String((error.params as { type?: unknown }).type || "").trim();
    return expectedType ? `set ${field} as ${expectedType}` : `set valid value for ${field}`;
  }
  if (error.keyword === "enum") return `set ${field} to one of allowed values`;
  return `set valid value for ${field}`;
}

function getWempSchemaValidator(): ValidateFunction<WempChannelConfig> {
  if (wempSchemaValidator) return wempSchemaValidator;
  const ajv = new Ajv({ allErrors: true, strict: false });
  wempSchemaValidator = ajv.compile(wempConfigSchema.schema as object) as ValidateFunction<WempChannelConfig>;
  return wempSchemaValidator;
}

function validateWempConfigSchema(channelCfg: WempChannelConfig): string[] {
  const validate = getWempSchemaValidator();
  const valid = validate(channelCfg);
  if (valid) return [];
  const errors = validate.errors || [];
  return errors.map((error) => {
    const field = resolveSchemaField(error);
    const fix = resolveSchemaFix(error, field);
    const message = error.message ? `schema ${error.message}` : `schema validation failed (${error.keyword})`;
    return formatConfigIssue(message, { field, fix });
  });
}

function normalizeDm(dm?: WempAccountConfig["dm"]) {
  return {
    policy: dm?.policy ?? "pairing",
    allowFrom: Array.isArray(dm?.allowFrom) ? dm!.allowFrom : [],
  } as const;
}

function normalizeRouting(routing?: WempAccountConfig["routing"]) {
  return {
    pairedAgent: routing?.pairedAgent ?? "main",
    unpairedAgent: routing?.unpairedAgent ?? "wemp-kf",
  } as const;
}

function normalizeKnowledge(knowledge?: WempAccountConfig["knowledge"]) {
  const defaultProviders: WempKnowledgeConfig["providers"] = [{ type: "local", enabled: true, name: "local" }];
  return {
    mode: knowledge?.mode ?? "local",
    providers: Array.isArray(knowledge?.providers) ? knowledge!.providers : defaultProviders,
  } as const;
}

function normalizeFeatures(features?: WempChannelConfig["features"]) {
  const unpairedAllowedAgents = Array.isArray(features?.routeGuard?.unpairedAllowedAgents)
    ? Array.from(new Set(features.routeGuard.unpairedAllowedAgents.map((agent) => String(agent || "").trim()).filter(Boolean)))
    : ["wemp-kf"];
  const handoffTicketEvents: Array<"activated" | "resumed"> = Array.isArray(features?.handoff?.ticketWebhook?.events)
    ? Array.from(new Set<Array<"activated" | "resumed">[number]>(
      features.handoff.ticketWebhook.events
        .map((event) => String(event || "").trim().toLowerCase())
        .filter((event): event is "activated" | "resumed" => event === "activated" || event === "resumed"),
    ))
    : ["activated"];
  const handoffTicketWebhook: WempHandoffTicketWebhookConfig = {
    enabled: features?.handoff?.ticketWebhook?.enabled ?? false,
    endpoint: String(features?.handoff?.ticketWebhook?.endpoint || "").trim(),
    token: String(features?.handoff?.ticketWebhook?.token || "").trim(),
    events: handoffTicketEvents,
  };

  return {
    menu: {
      enabled: features?.menu?.enabled ?? false,
      items: features?.menu?.items ?? [],
    },
    assistantToggle: {
      enabled: features?.assistantToggle?.enabled ?? false,
      defaultEnabled: features?.assistantToggle?.defaultEnabled ?? false,
    },
    usageLimit: {
      enabled: features?.usageLimit?.enabled ?? false,
      dailyMessages: features?.usageLimit?.dailyMessages ?? 0,
      dailyTokens: features?.usageLimit?.dailyTokens ?? 0,
      exemptPaired: features?.usageLimit?.exemptPaired ?? true,
    },
    routeGuard: {
      enabled: features?.routeGuard?.enabled ?? true,
      unpairedAllowedAgents,
    },
    handoff: {
      enabled: features?.handoff?.enabled ?? false,
      contact: features?.handoff?.contact ?? "",
      message: features?.handoff?.message ?? "如需人工支持，请联系：{{contact}}",
      autoResumeMinutes: Number.isFinite(Number(features?.handoff?.autoResumeMinutes))
        ? Math.max(1, Math.floor(Number(features?.handoff?.autoResumeMinutes)))
        : 30,
      activeReply: features?.handoff?.activeReply ?? "当前会话已转人工处理，请稍候。",
      ticketWebhook: handoffTicketWebhook,
    },
    welcome: {
      enabled: features?.welcome?.enabled ?? false,
      subscribeText: features?.welcome?.subscribeText ?? "欢迎关注，AI 助手已开启。你可以直接发送问题，或先完成配对后接入主助手。",
    },
  } as const;
}

export function listWempAccountIds(cfg: { channels?: { wemp?: WempChannelConfig } }): string[] {
  const channelCfg = cfg.channels?.wemp;
  if (!channelCfg) return [];
  const ids = new Set<string>();
  if (channelCfg.appId) ids.add(DEFAULT_ACCOUNT_ID);
  if (channelCfg.accounts) Object.keys(channelCfg.accounts).forEach((id) => ids.add(id));
  return ids.size ? Array.from(ids) : [DEFAULT_ACCOUNT_ID];
}

export function resolveDefaultWempAccountId(cfg: { channels?: { wemp?: WempChannelConfig } }): string {
  return cfg.channels?.wemp?.defaultAccount || DEFAULT_ACCOUNT_ID;
}

function hasValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isDefaultAccountId(accountId: string): boolean {
  return accountId === DEFAULT_ACCOUNT_ID;
}

function accountFieldPath(accountId: string, field: string): string {
  return isDefaultAccountId(accountId) ? `channels.wemp.${field}` : `channels.wemp.accounts.${accountId}.${field}`;
}

function sharedFieldPath(accountId: string, field: string): string | null {
  return isDefaultAccountId(accountId) ? null : `channels.wemp.${field}`;
}

function buildFieldFix(accountId: string, field: string, extraHint?: string): string {
  const primaryPath = accountFieldPath(accountId, field);
  const fallbackPath = sharedFieldPath(accountId, field);
  const hint = extraHint ? ` ${extraHint}` : "";
  if (fallbackPath) {
    return `set ${primaryPath}${hint} (or shared ${fallbackPath})`;
  }
  return `set ${primaryPath}${hint}`;
}

function formatConfigIssue(message: string, details: Record<string, string | number>): string {
  const suffix = Object.entries(details).map(([key, value]) => `${key}=${value}`).join("; ");
  return suffix ? `${message}; ${suffix}` : message;
}

export function validateResolvedWempAccount(account: ResolvedWempAccount): string[] {
  const issues: string[] = [];
  const accountId = account.accountId || DEFAULT_ACCOUNT_ID;
  if (!hasValue(account.appId)) {
    issues.push(formatConfigIssue("appId missing", {
      accountId,
      field: "appId",
      fix: buildFieldFix(accountId, "appId"),
    }));
  }
  if (!hasValue(account.appSecret)) {
    issues.push(formatConfigIssue("appSecret missing", {
      accountId,
      field: "appSecret",
      fix: buildFieldFix(accountId, "appSecret"),
    }));
  }
  if (!hasValue(account.token)) {
    issues.push(formatConfigIssue("token missing", {
      accountId,
      field: "token",
      fix: buildFieldFix(accountId, "token"),
    }));
  }
  if (!hasValue(account.webhookPath) || !account.webhookPath.startsWith("/")) {
    issues.push(formatConfigIssue("webhookPath must start with '/'", {
      accountId,
      field: "webhookPath",
      current: hasValue(account.webhookPath) ? account.webhookPath.trim() : "<empty>",
      fix: buildFieldFix(accountId, "webhookPath", "to start with '/' (example: '/wemp')"),
    }));
  }
  if (account.encodingAESKey && account.encodingAESKey.trim().length !== 43) {
    issues.push(formatConfigIssue("encodingAESKey should be 43 chars", {
      accountId,
      field: "encodingAESKey",
      currentLength: account.encodingAESKey.trim().length,
      fix: buildFieldFix(accountId, "encodingAESKey", "to the 43-char key from WeChat"),
    }));
  }
  return issues;
}

export function validateWempChannelConfig(cfg: { channels?: { wemp?: WempChannelConfig } }): string[] {
  const issues: string[] = [];
  const channelCfg = cfg.channels?.wemp;
  if (!channelCfg) return issues;
  issues.push(...validateWempConfigSchema(channelCfg));
  const pathToAccount = new Map<string, string>();
  const ids = listWempAccountIds(cfg);
  for (const id of ids) {
    const account = resolveWempAccount(cfg, id);
    const path = account.webhookPath;
    const prev = pathToAccount.get(path);
    if (prev && prev !== id) {
      issues.push(formatConfigIssue(`webhookPath conflict: '${path}' used by '${prev}' and '${id}'`, {
        accountIds: `${prev},${id}`,
        field: "webhookPath",
        fix: `use different values in ${accountFieldPath(prev, "webhookPath")} and ${accountFieldPath(id, "webhookPath")}`,
      }));
    } else {
      pathToAccount.set(path, id);
    }
  }
  return issues;
}

export function resolveWempAccount(cfg: { channels?: { wemp?: WempChannelConfig } }, accountId?: string): ResolvedWempAccount {
  const channelCfg = cfg.channels?.wemp ?? {};
  const id = accountId || resolveDefaultWempAccountId(cfg);
  const isDefault = id === DEFAULT_ACCOUNT_ID;
  const accountCfg: WempAccountConfig = isDefault ? channelCfg : (channelCfg.accounts?.[id] ?? {});

  const mergedDm = normalizeDm(accountCfg.dm ?? channelCfg.dm);
  const mergedRouting = normalizeRouting(accountCfg.routing ?? channelCfg.routing);
  const mergedKnowledge = normalizeKnowledge(accountCfg.knowledge ?? channelCfg.knowledge);
  const mergedFeatures = normalizeFeatures(channelCfg.features);
  const appId = accountCfg.appId ?? channelCfg.appId ?? "";
  const appSecret = accountCfg.appSecret ?? channelCfg.appSecret ?? "";
  const token = accountCfg.token ?? channelCfg.token ?? "";
  const webhookPath = accountCfg.webhookPath ?? channelCfg.webhookPath ?? DEFAULT_WEBHOOK_PATH;
  const requireHttps = accountCfg.requireHttps === true || channelCfg.requireHttps === true;
  const enabled = accountCfg.enabled ?? channelCfg.enabled ?? false;

  const resolved: ResolvedWempAccount = {
    accountId: id,
    enabled,
    configured: false,
    name: accountCfg.name ?? channelCfg.name,
    appId,
    appSecret,
    token,
    encodingAESKey: accountCfg.encodingAESKey ?? channelCfg.encodingAESKey,
    webhookPath,
    requireHttps,
    dm: mergedDm,
    routing: mergedRouting,
    knowledge: mergedKnowledge,
    features: mergedFeatures,
    config: accountCfg,
  };
  const validationIssues = validateResolvedWempAccount(resolved);
  resolved.configured = validationIssues.length === 0;
  return resolved;
}
