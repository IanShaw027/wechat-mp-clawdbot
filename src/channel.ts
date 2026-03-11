import type { IncomingMessage, ServerResponse } from "node:http";
import type { ChannelPlugin, OpenclawConfig } from "openclaw/plugin-sdk";
import { wempConfigSchema } from "./config-schema.js";
import { listWempAccountIds, resolveDefaultWempAccountId, resolveWempAccount, validateResolvedWempAccount, validateWempChannelConfig } from "./config.js";
import { defaultRuntime, markRuntimeConnected, markRuntimeError, mergeRuntimeSnapshot } from "./status.js";
import { resolveDmPolicy } from "./security.js";
import {
  handleRegisteredWebhookRequest,
  registerWempWebhook,
  unregisterWempWebhook,
  unregisterWempWebhookByAccountId,
} from "./webhook.js";
import { sendText } from "./outbound.js";
import {
  applyWechatMenuConfig,
  buildAccountConfigSignature,
  buildMenuConfigSignature,
  normalizeMenuFeature,
  type MenuFeatureConfig,
} from "./features/menu.js";
import { createWempOnboarding } from "./onboarding.js";
import { flushPairingNotificationsToExternal } from "./pairing.js";
import { flushHandoffNotificationsToExternal } from "./features/handoff-notify.js";
import { clearWempRuntime, trySetWempRuntime } from "./runtime.js";
import { attachOpenClawLogBridge, detachOpenClawLogBridge } from "./log.js";

type WempPluginCompat = ChannelPlugin<any> & { onboarding?: unknown };
const activeAccounts = new Set<string>();
const appliedAccountStateByAccount = new Map<string, {
  signature: string;
  account: any;
}>();
const stopAccountHandlersByAccount = new Map<string, () => void>();

interface MenuSyncState {
  accountSignature: string;
  menuSignature: string;
  lastSuccessfulMenu: Required<MenuFeatureConfig>;
}

const menuSyncStateByAccount = new Map<string, MenuSyncState>();
const PAIRING_NOTIFY_PUMP_INTERVAL_MS = Math.max(1_000, Number(process.env.WEMP_PAIRING_NOTIFY_PUMP_INTERVAL_MS || 5_000));
const HANDOFF_NOTIFY_PUMP_INTERVAL_MS = Math.max(1_000, Number(process.env.WEMP_HANDOFF_NOTIFY_PUMP_INTERVAL_MS || 5_000));
let pairingNotifyPumpTimer: ReturnType<typeof setInterval> | null = null;
let handoffNotifyPumpTimer: ReturnType<typeof setInterval> | null = null;

function startPairingNotifyPump(): void {
  if (pairingNotifyPumpTimer) return;
  pairingNotifyPumpTimer = setInterval(() => {
    void flushPairingNotificationsToExternal();
  }, PAIRING_NOTIFY_PUMP_INTERVAL_MS);
  (pairingNotifyPumpTimer as any)?.unref?.();
}

function stopPairingNotifyPump(): void {
  if (!pairingNotifyPumpTimer) return;
  clearInterval(pairingNotifyPumpTimer);
  pairingNotifyPumpTimer = null;
}

function startHandoffNotifyPump(): void {
  if (handoffNotifyPumpTimer) return;
  handoffNotifyPumpTimer = setInterval(() => {
    void flushHandoffNotificationsToExternal();
  }, HANDOFF_NOTIFY_PUMP_INTERVAL_MS);
  (handoffNotifyPumpTimer as any)?.unref?.();
}

function stopHandoffNotifyPump(): void {
  if (!handoffNotifyPumpTimer) return;
  clearInterval(handoffNotifyPumpTimer);
  handoffNotifyPumpTimer = null;
}

interface AccountLifecycleContext {
  log?: {
    info?: (...args: unknown[]) => void;
    warn?: (...args: unknown[]) => void;
    error?: (...args: unknown[]) => void;
  };
  getStatus: () => Record<string, unknown>;
  setStatus: (status: Record<string, unknown>) => void;
}

function cloneAccountState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function rememberAppliedAccount(account: any): void {
  appliedAccountStateByAccount.set(account.accountId, {
    signature: buildAccountConfigSignature(account),
    account: cloneAccountState(account),
  });
}

function forgetAppliedAccount(accountId: string): void {
  appliedAccountStateByAccount.delete(accountId);
}

function restorePreviousAccount(accountId: string): any | null {
  const previous = appliedAccountStateByAccount.get(accountId);
  if (!previous?.account?.enabled) return null;
  return cloneAccountState(previous.account);
}

function stopAccountRuntime(accountId: string): boolean {
  const stop = stopAccountHandlersByAccount.get(accountId);
  if (!stop) return false;
  stopAccountHandlersByAccount.delete(accountId);
  stop();
  forgetAppliedAccount(accountId);
  return true;
}

function syncMenuForAccount(account: any, ctx: AccountLifecycleContext): void {
  const menuFeature = normalizeMenuFeature(account.features.menu);
  const accountSignature = buildAccountConfigSignature(account);
  const menuSignature = buildMenuConfigSignature(menuFeature);
  const previousMenuSyncState = menuSyncStateByAccount.get(account.accountId);
  const accountConfigChanged = !previousMenuSyncState || previousMenuSyncState.accountSignature !== accountSignature;
  const menuConfigChanged = !previousMenuSyncState || previousMenuSyncState.menuSignature !== menuSignature;
  const shouldSyncMenu = menuFeature.enabled
    ? accountConfigChanged || menuConfigChanged
    : Boolean(previousMenuSyncState && menuConfigChanged);
  if (!shouldSyncMenu) return;

  void (async () => {
    try {
      const syncResult = await applyWechatMenuConfig(account, menuFeature, {
        deleteWhenDisabled: !menuFeature.enabled || menuFeature.items.length === 0,
      });
      if (syncResult.ok) {
        menuSyncStateByAccount.set(account.accountId, {
          accountSignature,
          menuSignature,
          lastSuccessfulMenu: normalizeMenuFeature(menuFeature),
        });
        return;
      }

      const syncError = `menu_sync_failed:${syncResult.errcode ?? "unknown"}:${syncResult.errmsg ?? "unknown"}`;
      const rollbackMenu = previousMenuSyncState?.lastSuccessfulMenu;
      const shouldRollback = Boolean(rollbackMenu);
      if (shouldRollback && rollbackMenu) {
        const rollbackMenuSignature = buildMenuConfigSignature(rollbackMenu);
        const rollbackResult = await applyWechatMenuConfig(account, rollbackMenu, {
          deleteWhenDisabled: !rollbackMenu.enabled || rollbackMenu.items.length === 0,
        });
        if (rollbackResult.ok) {
          if (rollbackMenuSignature === menuSignature) {
            menuSyncStateByAccount.set(account.accountId, {
              accountSignature,
              menuSignature,
              lastSuccessfulMenu: normalizeMenuFeature(menuFeature),
            });
          }
          const rollbackMessage = `${syncError};rolled_back`;
          ctx.log?.warn?.(`[wemp:${account.accountId}] ${rollbackMessage}`);
          const nextSnapshot = markRuntimeError(account.accountId, rollbackMessage);
          ctx.setStatus({
            ...ctx.getStatus(),
            ...nextSnapshot,
          });
          return;
        }
        const rollbackError = `${syncError};rollback_failed:${rollbackResult.errcode ?? "unknown"}:${rollbackResult.errmsg ?? "unknown"}`;
        ctx.log?.warn?.(`[wemp:${account.accountId}] ${rollbackError}`);
        const nextSnapshot = markRuntimeError(account.accountId, rollbackError);
        ctx.setStatus({
          ...ctx.getStatus(),
          ...nextSnapshot,
        });
        return;
      }

      ctx.log?.warn?.(`[wemp:${account.accountId}] ${syncError}`);
      const nextSnapshot = markRuntimeError(account.accountId, syncError);
      ctx.setStatus({
        ...ctx.getStatus(),
        ...nextSnapshot,
      });
    } catch (error) {
      const unexpectedError = error instanceof Error ? error.message : String(error);
      const syncError = `menu_sync_failed:unexpected:${unexpectedError}`;
      ctx.log?.warn?.(`[wemp:${account.accountId}] ${syncError}`);
      const nextSnapshot = markRuntimeError(account.accountId, syncError);
      ctx.setStatus({
        ...ctx.getStatus(),
        ...nextSnapshot,
      });
    }
  })();
}

function asIncoming(value: unknown): IncomingMessage | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.method === "string" || typeof obj.url === "string") {
    return value as IncomingMessage;
  }
  return null;
}

function asServerResponse(value: unknown): ServerResponse | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.setHeader === "function" && typeof obj.end === "function") {
    return value as ServerResponse;
  }
  return null;
}

function resolveRequestResponse(args: unknown[]): { req: IncomingMessage; res: ServerResponse } | null {
  if (!args.length) return null;
  const directReq = asIncoming(args[0]);
  const directRes = asServerResponse(args[1]);
  if (directReq && directRes) return { req: directReq, res: directRes };

  const maybeCtx = args[0] as Record<string, unknown>;
  if (!maybeCtx || typeof maybeCtx !== "object") return null;
  const req = asIncoming(maybeCtx.req || maybeCtx.request || maybeCtx.incomingMessage || maybeCtx.incoming);
  const res = asServerResponse(maybeCtx.res || maybeCtx.response || maybeCtx.serverResponse);
  if (req && res) return { req, res };
  return null;
}

const wempPluginDef: WempPluginCompat = {
  id: "wemp",
  meta: {
    id: "wemp",
    label: "微信公众号",
    selectionLabel: "微信公众号 (plugin)",
    docsPath: "/channels/wemp",
    blurb: "Official-style WeChat MP channel with paired/unpaired routing.",
    order: 86,
  },
  capabilities: {
    chatTypes: ["direct"],
    media: true,
    reactions: false,
    threads: false,
    polls: false,
    nativeCommands: false,
    blockStreaming: true,
  },
  reload: { configPrefixes: ["channels.wemp"] },
  configSchema: wempConfigSchema,
  config: {
    listAccountIds: (cfg: OpenclawConfig) => listWempAccountIds(cfg),
    resolveAccount: (cfg: OpenclawConfig, accountId?: string) => {
      const account = resolveWempAccount(cfg, accountId);
      const accountIssues = validateResolvedWempAccount(account);
      const channelIssues = validateWempChannelConfig(cfg);
      if (accountIssues.length || channelIssues.length) {
        account.configured = false;
      }
      return account;
    },
    defaultAccountId: (cfg: OpenclawConfig) => resolveDefaultWempAccountId(cfg),
    isConfigured: (account: { configured: boolean }) => account.configured,
    describeAccount: (account: any) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: account.configured,
      webhookPath: account.webhookPath,
    }),
  },
  security: {
    resolveDmPolicy: ({ account }: { account: any }) => resolveDmPolicy(account),
  },
  outbound: {
    deliveryMode: "direct",
    chunkerMode: "text",
    textChunkLimit: 600,
    sendText: async ({ account, target, text }: { account: any; target: string; text: string }) => {
      const result = await sendText(account, target, text);
      return {
        channel: "wemp",
        ok: true,
        messageId: `${result.accountId}:${result.target}:${result.chunks.length}`,
      };
    },
  },
  gateway: {
    handleRequest: async (...args: unknown[]) => {
      const pair = resolveRequestResponse(args);
      if (!pair) return { handled: false, reason: "request_or_response_missing" };
      const handled = await handleRegisteredWebhookRequest(pair.req, pair.res);
      return { handled };
    },
    startAccount: async (ctx) => {
      const account = ctx.account;
      const accountId = account.accountId;
      attachOpenClawLogBridge(accountId, ctx.log);
      activeAccounts.add(accountId);
      startPairingNotifyPump();
      startHandoffNotifyPump();

      const cleanupAccountContext = () => {
        detachOpenClawLogBridge(accountId);
        activeAccounts.delete(accountId);
        stopAccountHandlersByAccount.delete(accountId);
        forgetAppliedAccount(accountId);
        if (activeAccounts.size === 0) {
          stopPairingNotifyPump();
          stopHandoffNotifyPump();
          clearWempRuntime();
        }
      };

      const waitForAbort = (beforeCleanup?: () => void) => {
        let cleaned = false;
        let resolver: (() => void) | null = null;
        const runCleanup = () => {
          if (cleaned) return;
          cleaned = true;
          try {
            beforeCleanup?.();
          } finally {
            cleanupAccountContext();
            resolver?.();
            resolver = null;
          }
        };
        stopAccountHandlersByAccount.set(accountId, runCleanup);
        if (ctx.abortSignal.aborted) {
          runCleanup();
          return Promise.resolve();
        }
        return new Promise<void>((resolve) => {
          resolver = resolve;
          ctx.abortSignal.addEventListener("abort", () => {
            runCleanup();
          }, { once: true });
        });
      };

      const accountIssues = validateResolvedWempAccount(account);
      if (accountIssues.length) {
        const message = `invalid_account_config:${accountIssues.join("; ")}`;
        const snapshot = markRuntimeError(account.accountId, message);
        ctx.setStatus({
          ...ctx.getStatus(),
          ...snapshot,
          running: false,
          connected: false,
        });
        ctx.log?.error?.(`[wemp:${account.accountId}] ${message}`);
        return waitForAbort();
      }

      if (!account.enabled) {
        unregisterWempWebhookByAccountId(account.accountId);
        menuSyncStateByAccount.delete(account.accountId);
        forgetAppliedAccount(account.accountId);
        const disconnectedSnapshot = markRuntimeConnected(account.accountId, false);
        const errorSnapshot = markRuntimeError(account.accountId, "account_disabled");
        ctx.setStatus({
          ...ctx.getStatus(),
          ...disconnectedSnapshot,
          ...errorSnapshot,
          running: false,
          connected: false,
        });
        ctx.log?.info?.(`[wemp:${account.accountId}] account disabled, skip webhook registration`);
        return waitForAbort(() => {
          unregisterWempWebhookByAccountId(account.accountId);
        });
      }

      const runtimeBound = trySetWempRuntime((ctx as any)?.runtime || ctx);
      if (!runtimeBound) {
        ctx.log?.warn?.(`[wemp:${account.accountId}] runtime dispatchInbound unavailable on startAccount context`);
      }
      const registered = registerWempWebhook(account);
      mergeRuntimeSnapshot(account.accountId, ctx.getStatus());
      const connectedSnapshot = markRuntimeConnected(account.accountId, true, Date.now());
      ctx.setStatus({
        ...ctx.getStatus(),
        ...connectedSnapshot,
      });
      rememberAppliedAccount(account);
      ctx.log?.info?.(`[wemp:${account.accountId}] webhook registered at ${registered.path}`);
      syncMenuForAccount(account, {
        log: ctx.log,
        getStatus: () => ctx.getStatus(),
        setStatus: (status) => ctx.setStatus(status),
      });
      return waitForAbort(() => {
        unregisterWempWebhook(account);
        const stopped = markRuntimeConnected(account.accountId, false);
        ctx.setStatus({
          ...ctx.getStatus(),
          ...stopped,
        });
      });
    },
    reloadAccount: async (ctx: any) => {
      const account = ctx.account;
      const accountId = account.accountId;
      attachOpenClawLogBridge(accountId, ctx.log);
      const nextSignature = buildAccountConfigSignature(account);
      const previousApplied = appliedAccountStateByAccount.get(accountId);
      if (previousApplied?.signature === nextSignature) {
        ctx.log?.info?.(`[wemp:${accountId}] reload skipped, config unchanged`);
        return;
      }

      const accountIssues = validateResolvedWempAccount(account);
      if (accountIssues.length) {
        const message = `invalid_account_config:${accountIssues.join("; ")}`;
        const rollbackAccount = restorePreviousAccount(accountId);
        if (rollbackAccount) {
          const registered = registerWempWebhook(rollbackAccount);
          const connectedSnapshot = markRuntimeConnected(accountId, true, Date.now());
          const rollbackMessage = `reload_rolled_back:${message}`;
          const errorSnapshot = markRuntimeError(accountId, rollbackMessage);
          ctx.setStatus({
            ...ctx.getStatus(),
            ...connectedSnapshot,
            ...errorSnapshot,
          });
          ctx.log?.warn?.(`[wemp:${accountId}] ${rollbackMessage}; restored webhook ${registered.path}`);
          return;
        }
        unregisterWempWebhookByAccountId(accountId);
        const snapshot = markRuntimeError(accountId, message);
        ctx.setStatus({
          ...ctx.getStatus(),
          ...snapshot,
          running: false,
          connected: false,
        });
        ctx.log?.error?.(`[wemp:${accountId}] ${message}`);
        return;
      }

      if (!account.enabled) {
        unregisterWempWebhookByAccountId(accountId);
        menuSyncStateByAccount.delete(accountId);
        forgetAppliedAccount(accountId);
        const disconnectedSnapshot = markRuntimeConnected(accountId, false);
        const errorSnapshot = markRuntimeError(accountId, "account_disabled");
        ctx.setStatus({
          ...ctx.getStatus(),
          ...disconnectedSnapshot,
          ...errorSnapshot,
          running: false,
          connected: false,
        });
        ctx.log?.info?.(`[wemp:${accountId}] account disabled on reload, webhook unregistered`);
        return;
      }

      const runtimeBound = trySetWempRuntime((ctx as any)?.runtime || ctx);
      if (!runtimeBound) {
        ctx.log?.warn?.(`[wemp:${accountId}] runtime dispatchInbound unavailable on reloadAccount context`);
      }

      const registered = registerWempWebhook(account);
      mergeRuntimeSnapshot(accountId, ctx.getStatus());
      const connectedSnapshot = markRuntimeConnected(accountId, true, Date.now());
      ctx.setStatus({
        ...ctx.getStatus(),
        ...connectedSnapshot,
      });
      rememberAppliedAccount(account);
      ctx.log?.info?.(`[wemp:${accountId}] account reloaded, webhook registered at ${registered.path}`);

      syncMenuForAccount(account, {
        log: ctx.log,
        getStatus: () => ctx.getStatus(),
        setStatus: (status) => ctx.setStatus(status),
      });
    },
    stopAccount: async (ctx: any) => {
      const accountId = String(ctx?.account?.accountId || "").trim();
      if (!accountId) return;
      const stopped = stopAccountRuntime(accountId);
      unregisterWempWebhookByAccountId(accountId);
      menuSyncStateByAccount.delete(accountId);
      const disconnectedSnapshot = markRuntimeConnected(accountId, false);
      const errorSnapshot = markRuntimeError(accountId, "account_stopped");
      ctx.setStatus?.({
        ...(ctx.getStatus?.() || {}),
        ...disconnectedSnapshot,
        ...errorSnapshot,
        running: false,
        connected: false,
      });
      if (!stopped) {
        detachOpenClawLogBridge(accountId);
      }
      ctx.log?.info?.(`[wemp:${accountId}] account stopped`);
    },
  },
  status: {
    defaultRuntime: defaultRuntime(),
    buildAccountSnapshot: ({ account, runtime }: { account: any; runtime?: any }) => {
      const mergedRuntime = mergeRuntimeSnapshot(account.accountId, runtime);
      return {
        accountId: account.accountId,
        name: account.name,
        enabled: account.enabled,
        configured: account.configured,
        webhookPath: account.webhookPath,
        running: mergedRuntime.running,
        connected: mergedRuntime.connected,
        lastConnectedAt: mergedRuntime.lastConnectedAt,
        lastInboundAt: mergedRuntime.lastInboundAt,
        lastOutboundAt: mergedRuntime.lastOutboundAt,
        lastError: mergedRuntime.lastError,
      };
    },
  },
  onboarding: createWempOnboarding(),
};

export const wempPlugin: ChannelPlugin<any> = wempPluginDef;
