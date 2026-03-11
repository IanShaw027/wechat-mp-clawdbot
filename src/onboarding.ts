import type { WempKnowledgeProviderConfig, WempScaffoldAnswers } from "./types.js";
import { scaffoldWempKf } from "./scaffold.js";

type WempKnowledgeMode = "local" | "external" | "hybrid";

const DEFAULT_SUPPORT_AGENT_ID = "wemp-kf";
const DEFAULT_PAIRED_AGENT_ID = "main";
const DEFAULT_UNPAIRED_AGENT_ID = "wemp-kf";
const DEFAULT_LOCAL_PROVIDER: WempKnowledgeProviderConfig = { type: "local", enabled: true, name: "local" };
const DEFAULT_DIFY_PROVIDER: WempKnowledgeProviderConfig = { type: "dify", enabled: true, name: "dify" };
const DEFAULT_HYBRID_PROVIDERS: WempKnowledgeProviderConfig[] = [DEFAULT_LOCAL_PROVIDER, DEFAULT_DIFY_PROVIDER];
const KNOWN_INPUT_KEYS = new Set([
  "createSupportAgent",
  "supportAgentId",
  "pairedAgentId",
  "unpairedAgentId",
  "knowledgeMode",
  "knowledgeProviders",
  "answers",
  "brandName",
  "audience",
  "services",
  "contact",
  "escalationRules",
  "tone",
  "template",
]);

const DEFAULT_ANSWERS: WempScaffoldAnswers = {
  brandName: "未命名品牌",
  audience: "请补充服务对象",
  services: "请补充核心服务",
  contact: "请补充联系方式",
  escalationRules: "报价、投诉、交付承诺、复杂技术问题转人工",
  tone: "专业、亲切、简洁",
  template: "general",
};

export interface WempOnboardingPlan {
  createSupportAgent: boolean;
  supportAgentId: string;
  pairedAgentId: string;
  unpairedAgentId: string;
  answers: WempScaffoldAnswers;
  knowledgeMode: WempKnowledgeMode;
  knowledgeProviders: WempKnowledgeProviderConfig[];
}

export interface WempOnboardingInput {
  createSupportAgent?: boolean;
  supportAgentId?: string;
  pairedAgentId?: string;
  unpairedAgentId?: string;
  knowledgeMode?: WempKnowledgeMode;
  knowledgeProviders?: WempKnowledgeProviderConfig[];
  answers?: Partial<WempScaffoldAnswers>;
  brandName?: string;
  audience?: string;
  services?: string;
  contact?: string;
  escalationRules?: string;
  tone?: string;
  template?: WempScaffoldAnswers["template"] | string;
}

export interface WempOnboardingInputSpec {
  defaults: {
    createSupportAgent: boolean;
    supportAgentId: string;
    pairedAgentId: string;
    unpairedAgentId: string;
    knowledgeMode: WempKnowledgeMode;
    answers: WempScaffoldAnswers;
    knowledgeProviders: WempKnowledgeProviderConfig[];
  };
  requiredPatch: Array<keyof WempScaffoldAnswers>;
  optionalPatch: string[];
  notes: string[];
}

export interface WempOnboardingQuestion {
  id: string;
  label: string;
  required: boolean;
  type: "text" | "select" | "boolean";
  options?: string[];
  placeholder?: string;
}

export interface WempOnboardingStage {
  id: string;
  title: string;
  description: string;
  questions: WempOnboardingQuestion[];
}

export interface WempOnboardingScaffoldResult {
  agentRoot?: string;
  supportAgentId: string;
  created: string[];
  skipped: string[];
  summary: string[];
}

export interface WempOnboardingExecutionResult extends WempOnboardingScaffoldResult {
  plan: WempOnboardingPlan;
}

export interface WempOnboardingHandler {
  id: "wemp";
  defaults: WempOnboardingPlan;
  inputSpec: WempOnboardingInputSpec;
  stages: WempOnboardingStage[];
  buildPlan: (input?: WempOnboardingInput) => WempOnboardingPlan;
  run: (...args: unknown[]) => Promise<WempOnboardingExecutionResult>;
}

export const wempOnboardingInputSpec: WempOnboardingInputSpec = {
  defaults: {
    createSupportAgent: true,
    supportAgentId: DEFAULT_SUPPORT_AGENT_ID,
    pairedAgentId: DEFAULT_PAIRED_AGENT_ID,
    unpairedAgentId: DEFAULT_UNPAIRED_AGENT_ID,
    knowledgeMode: "local",
    answers: { ...DEFAULT_ANSWERS },
    knowledgeProviders: [DEFAULT_LOCAL_PROVIDER],
  },
  requiredPatch: ["brandName", "audience", "services", "contact", "escalationRules", "tone", "template"],
  optionalPatch: ["createSupportAgent", "supportAgentId", "pairedAgentId", "unpairedAgentId", "knowledgeMode", "knowledgeProviders"],
  notes: [
    "输入缺失时会回退默认值，不会阻断 scaffold 执行。",
    "template 仅支持 enterprise/content/general，非法值自动回退 general。",
    "providers 缺失时按 knowledgeMode 自动补全默认 provider。",
  ],
};

export const wempOnboardingStages: WempOnboardingStage[] = [
  {
    id: "channel-access",
    title: "阶段 1：渠道接入配置",
    description: "先完成公众号接入参数，保证 webhook 可用。",
    questions: [
      { id: "appId", label: "公众号 AppID", required: true, type: "text", placeholder: "wx_xxx" },
      { id: "appSecret", label: "公众号 AppSecret", required: true, type: "text", placeholder: "secret" },
      { id: "token", label: "校验 Token", required: true, type: "text", placeholder: "verify_token" },
      { id: "encodingAESKey", label: "EncodingAESKey", required: false, type: "text", placeholder: "43 chars, optional" },
      { id: "webhookPath", label: "Webhook Path", required: true, type: "text", placeholder: "/wemp" },
      { id: "dmPolicy", label: "DM Policy", required: true, type: "select", options: ["pairing", "allowlist", "open", "disabled"] },
    ],
  },
  {
    id: "routing",
    title: "阶段 2：路由配置",
    description: "配置配对前后路由与客服 agent。",
    questions: [
      { id: "pairedAgentId", label: "已配对路由 Agent", required: true, type: "text", placeholder: "main" },
      { id: "createSupportAgent", label: "是否自动创建客服 Agent", required: true, type: "boolean" },
      { id: "supportAgentId", label: "客服 Agent ID", required: true, type: "text", placeholder: "wemp-kf" },
      { id: "unpairedAgentId", label: "未配对路由 Agent", required: true, type: "text", placeholder: "wemp-kf" },
    ],
  },
  {
    id: "scaffold",
    title: "阶段 3：脚手架生成",
    description: "生成客服基础文件与知识库目录，不覆盖已有文件。",
    questions: [
      { id: "template", label: "初始化模板", required: true, type: "select", options: ["enterprise", "content", "general"] },
      { id: "knowledgeMode", label: "知识模式", required: true, type: "select", options: ["local", "external", "hybrid"] },
    ],
  },
  {
    id: "persona",
    title: "阶段 4：客服人设初始化",
    description: "采集人设与知识库核心问题（必问 + 可选）。",
    questions: [
      { id: "brandName", label: "品牌/公众号名称", required: true, type: "text" },
      { id: "audience", label: "服务对象", required: true, type: "text" },
      { id: "services", label: "核心服务", required: true, type: "text" },
      { id: "escalationRules", label: "转人工规则", required: true, type: "text" },
      { id: "contact", label: "联系方式", required: true, type: "text" },
      { id: "tone", label: "回复风格", required: true, type: "text" },
      { id: "recommendedLinks", label: "推荐文章/官网（可选）", required: false, type: "text" },
      { id: "forbiddenTopics", label: "禁止话题（可选）", required: false, type: "text" },
    ],
  },
];

export function buildDefaultOnboardingPlan(): WempOnboardingPlan {
  return {
    createSupportAgent: true,
    supportAgentId: DEFAULT_SUPPORT_AGENT_ID,
    pairedAgentId: DEFAULT_PAIRED_AGENT_ID,
    unpairedAgentId: DEFAULT_UNPAIRED_AGENT_ID,
    knowledgeMode: "local",
    knowledgeProviders: [DEFAULT_LOCAL_PROVIDER],
    answers: { ...DEFAULT_ANSWERS },
  };
}

export function applyOnboardingAnswers(plan: WempOnboardingPlan, patch: Partial<WempScaffoldAnswers>): WempOnboardingPlan {
  const answers = plan.answers;
  return {
    ...plan,
    answers: {
      brandName: normalizeText(patch.brandName, answers.brandName),
      audience: normalizeText(patch.audience, answers.audience),
      services: normalizeText(patch.services, answers.services),
      contact: normalizeText(patch.contact, answers.contact),
      escalationRules: normalizeText(patch.escalationRules, answers.escalationRules),
      tone: normalizeText(patch.tone, answers.tone),
      template: normalizeTemplate(patch.template, answers.template),
    },
  };
}

export function bindKnowledgeProviders(plan: WempOnboardingPlan, mode: WempKnowledgeMode, providers: WempKnowledgeProviderConfig[]): WempOnboardingPlan {
  const resolvedMode = normalizeKnowledgeMode(mode);
  const resolvedProviders = normalizeKnowledgeProviders(resolvedMode, providers);
  return {
    ...plan,
    knowledgeMode: resolvedMode,
    knowledgeProviders: resolvedProviders,
  };
}

export function buildOnboardingPlan(input?: WempOnboardingInput): WempOnboardingPlan {
  const seed = buildDefaultOnboardingPlan();
  const createSupportAgent = typeof input?.createSupportAgent === "boolean" ? input.createSupportAgent : seed.createSupportAgent;
  const supportAgentId = normalizeAgentId(input?.supportAgentId, seed.supportAgentId);
  const pairedAgentId = normalizeAgentId(input?.pairedAgentId, seed.pairedAgentId);
  const unpairedFallback = createSupportAgent ? supportAgentId : seed.unpairedAgentId;
  const unpairedAgentId = normalizeAgentId(input?.unpairedAgentId, unpairedFallback);

  const withRoute = {
    ...seed,
    createSupportAgent,
    supportAgentId,
    pairedAgentId,
    unpairedAgentId,
  };

  const withAnswers = applyOnboardingAnswers(withRoute, extractAnswersPatch(input));
  const mode = normalizeKnowledgeMode(input?.knowledgeMode ?? withAnswers.knowledgeMode);
  return bindKnowledgeProviders(withAnswers, mode, input?.knowledgeProviders ?? withAnswers.knowledgeProviders);
}

export function runOnboardingScaffold(workspaceRoot: string, plan: WempOnboardingPlan): WempOnboardingScaffoldResult {
  if (!plan.createSupportAgent) {
    return {
      supportAgentId: plan.supportAgentId,
      created: [],
      skipped: [],
      summary: [`已跳过客服 agent 创建，未配对路由将使用: ${plan.unpairedAgentId}`],
    };
  }
  const root = normalizeWorkspaceRoot(workspaceRoot);
  const result = scaffoldWempKf(root, plan.answers, plan.supportAgentId);
  const summary = [`已初始化客服 agent: ${plan.supportAgentId}`, `新增文件: ${result.created.length}，已存在跳过: ${result.skipped.length}`];
  return {
    agentRoot: result.agentRoot,
    supportAgentId: plan.supportAgentId,
    created: result.created,
    skipped: result.skipped,
    summary,
  };
}

export function executeWempOnboarding(workspaceRoot: string, input?: WempOnboardingInput): WempOnboardingExecutionResult {
  const plan = buildOnboardingPlan(input);
  const scaffold = runOnboardingScaffold(workspaceRoot, plan);
  const providerLabel = plan.knowledgeProviders.map((provider) => provider.name || provider.type).join(", ");
  return {
    ...scaffold,
    summary: [...scaffold.summary, `知识模式: ${plan.knowledgeMode}，providers: ${providerLabel || "none"}`],
    plan,
  };
}

export function createWempOnboarding(options?: { workspaceRoot?: string }): WempOnboardingHandler {
  const fallbackRoot = normalizeWorkspaceRoot(options?.workspaceRoot);
  return {
    id: "wemp",
    defaults: buildDefaultOnboardingPlan(),
    inputSpec: wempOnboardingInputSpec,
    stages: wempOnboardingStages,
    buildPlan: (input?: WempOnboardingInput) => buildOnboardingPlan(input),
    run: async (...args: unknown[]) => {
      const runArgs = normalizeRunArgs(args, fallbackRoot);
      return executeWempOnboarding(runArgs.workspaceRoot, runArgs.input);
    },
  };
}

export const buildWempOnboarding = createWempOnboarding;

function normalizeRunArgs(args: unknown[], fallbackRoot: string): { workspaceRoot: string; input?: WempOnboardingInput } {
  if (args.length === 0) {
    return { workspaceRoot: fallbackRoot };
  }

  const firstAsText = normalizeOptionalText(args[0]);
  if (firstAsText) {
    const second = asRecord(args[1]);
    if (second && looksLikeOnboardingInput(second)) {
      return { workspaceRoot: firstAsText, input: second as WempOnboardingInput };
    }
    return { workspaceRoot: firstAsText };
  }

  const first = asRecord(args[0]);
  const second = asRecord(args[1]);
  const workspaceRoot = normalizeWorkspaceRoot(readWorkspaceRoot(first) ?? fallbackRoot);

  if (second && looksLikeOnboardingInput(second)) {
    return { workspaceRoot, input: second as WempOnboardingInput };
  }

  const inputFromFirst = first?.input;
  if (asRecord(inputFromFirst) && looksLikeOnboardingInput(inputFromFirst as Record<string, unknown>)) {
    return { workspaceRoot, input: inputFromFirst as WempOnboardingInput };
  }

  if (first && looksLikeOnboardingInput(first)) {
    return { workspaceRoot, input: first as WempOnboardingInput };
  }

  return { workspaceRoot };
}

function extractAnswersPatch(input?: WempOnboardingInput): Partial<WempScaffoldAnswers> {
  const answers = asRecord(input?.answers);
  const patch: Partial<WempScaffoldAnswers> = {};
  const brandName = normalizeOptionalText(input?.brandName ?? answers?.brandName);
  const audience = normalizeOptionalText(input?.audience ?? answers?.audience);
  const services = normalizeOptionalText(input?.services ?? answers?.services);
  const contact = normalizeOptionalText(input?.contact ?? answers?.contact);
  const escalationRules = normalizeOptionalText(input?.escalationRules ?? answers?.escalationRules);
  const tone = normalizeOptionalText(input?.tone ?? answers?.tone);
  const template = normalizeTemplateOptional(input?.template ?? answers?.template);

  if (brandName) patch.brandName = brandName;
  if (audience) patch.audience = audience;
  if (services) patch.services = services;
  if (contact) patch.contact = contact;
  if (escalationRules) patch.escalationRules = escalationRules;
  if (tone) patch.tone = tone;
  if (template) patch.template = template;

  return patch;
}

function normalizeKnowledgeMode(mode: unknown): WempKnowledgeMode {
  if (mode === "external" || mode === "hybrid") {
    return mode;
  }
  return "local";
}

function normalizeKnowledgeProviders(mode: WempKnowledgeMode, providers: WempKnowledgeProviderConfig[]): WempKnowledgeProviderConfig[] {
  const normalized = providers
    .map((provider) => normalizeProvider(provider))
    .filter((provider): provider is WempKnowledgeProviderConfig => Boolean(provider));

  if (mode === "local") {
    const localProviders = normalized.filter((provider) => provider.type === "local");
    return localProviders.length ? localProviders : [DEFAULT_LOCAL_PROVIDER];
  }

  if (mode === "external") {
    const externalProviders = normalized.filter((provider) => provider.type !== "local");
    return externalProviders.length ? externalProviders : [DEFAULT_DIFY_PROVIDER];
  }

  if (normalized.length === 0) {
    return [...DEFAULT_HYBRID_PROVIDERS];
  }

  if (!normalized.some((provider) => provider.type === "local")) {
    return [DEFAULT_LOCAL_PROVIDER, ...normalized];
  }

  return normalized;
}

function normalizeProvider(provider: WempKnowledgeProviderConfig | undefined): WempKnowledgeProviderConfig | undefined {
  if (!provider || !isKnownProviderType(provider.type)) {
    return undefined;
  }

  const normalized: WempKnowledgeProviderConfig = {
    type: provider.type,
    enabled: typeof provider.enabled === "boolean" ? provider.enabled : true,
    name: normalizeOptionalText(provider.name) ?? provider.type,
  };

  const textKeys = ["baseUrl", "apiKey", "datasetId", "endpoint", "token", "database", "collection"] as const;
  for (const key of textKeys) {
    const value = normalizeOptionalText(provider[key]);
    if (value) {
      normalized[key] = value;
    }
  }

  return normalized;
}

function isKnownProviderType(type: unknown): type is WempKnowledgeProviderConfig["type"] {
  return type === "local" || type === "dify" || type === "milvus";
}

function normalizeTemplate(template: unknown, fallback: WempScaffoldAnswers["template"]): WempScaffoldAnswers["template"] {
  if (template === "enterprise" || template === "content" || template === "general") {
    return template;
  }
  return fallback;
}

function normalizeTemplateOptional(template: unknown): WempScaffoldAnswers["template"] | undefined {
  if (template === "enterprise" || template === "content" || template === "general") {
    return template;
  }
  return undefined;
}

function normalizeText(value: unknown, fallback: string): string {
  return normalizeOptionalText(value) ?? fallback;
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function normalizeAgentId(value: unknown, fallback: string): string {
  return normalizeOptionalText(value) ?? fallback;
}

function normalizeWorkspaceRoot(value: unknown): string {
  return normalizeOptionalText(value) ?? process.cwd();
}

function readWorkspaceRoot(input?: Record<string, unknown>): string | undefined {
  if (!input) {
    return undefined;
  }
  const candidates = [input.workspaceRoot, input.projectRoot, input.cwd];
  for (const candidate of candidates) {
    const normalized = normalizeOptionalText(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

function looksLikeOnboardingInput(input: Record<string, unknown>): boolean {
  return Object.keys(input).some((key) => KNOWN_INPUT_KEYS.has(key));
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as Record<string, unknown>;
}
