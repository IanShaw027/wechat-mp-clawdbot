import type { IncomingMessage, ServerResponse } from "node:http";
import type { ResolvedWempAccount } from "./types.js";
import { buildDedupKey, markIfNew } from "./dedup.js";
import { buildEncryptedReply, decryptWechatMessage, verifyMessageSignature, verifySignature } from "./crypto.js";
import { buildPassiveTextReply, getPathname, getSearchParams, readRequestBody, sendText } from "./http.js";
import { handleEventAction, handleInboundMessage, handleSubscribeEvent, handleUnsubscribeEvent, normalizeInboundText, parseWechatMessage, sanitizeInboundUserText } from "./inbound.js";
import { logError, logInfo, logWarn } from "./log.js";
import { buildInboundMediaSummary } from "./media.js";
import { clearHandoffState, getHandoffState } from "./features/handoff-state.js";
import { emitHandoffNotification, resolveHandoffTicketDelivery } from "./features/handoff-notify.js";
import { requestPairing } from "./pairing.js";
import { dispatchToAgent } from "./runtime.js";
import { markRuntimeError, markRuntimeInbound } from "./status.js";

export interface RegisteredWebhook {
  path: string;
  accountId: string;
}

const registeredByPath = new Map<string, ResolvedWempAccount>();
const inFlightByAccount = new Map<string, number>();
const MAX_IN_FLIGHT_PER_ACCOUNT = 64;
const INBOUND_TIMEOUT_MS = 3500;
const DISPATCH_TIMEOUT_MS = 3500;
const REQUEST_RATE_LIMIT_WINDOW_MS = Number(process.env.WEMP_RATE_LIMIT_WINDOW_MS || 10_000);
const REQUEST_RATE_LIMIT_MAX = Number(process.env.WEMP_RATE_LIMIT_MAX || 20);
const requestRateState = new Map<string, { windowStart: number; count: number }>();
const HANDOFF_RESUME_COMMANDS = new Set(["恢复ai", "恢复助手", "结束人工", "切回ai", "转回ai"]);

function isTruthyEnv(value: string | undefined): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isHttpsRequest(req: IncomingMessage): boolean {
  const socket = req.socket as IncomingMessage["socket"] & { encrypted?: boolean };
  if (socket.encrypted) return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const firstProto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)?.split(",")[0]?.trim().toLowerCase();
  return firstProto === "https";
}

function isOverRequestRateLimit(accountId: string, openId: string, now = Date.now()): boolean {
  const key = `${accountId}:${openId}`;
  const windowMs = Math.max(1_000, Number.isFinite(REQUEST_RATE_LIMIT_WINDOW_MS) ? REQUEST_RATE_LIMIT_WINDOW_MS : 10_000);
  const maxCount = Math.max(1, Number.isFinite(REQUEST_RATE_LIMIT_MAX) ? REQUEST_RATE_LIMIT_MAX : 20);
  const current = requestRateState.get(key);
  if (!current || now - current.windowStart >= windowMs) {
    requestRateState.set(key, { windowStart: now, count: 1 });
  } else {
    current.count += 1;
    requestRateState.set(key, current);
  }
  if (requestRateState.size > 2_000) {
    for (const [itemKey, item] of requestRateState.entries()) {
      if (now - item.windowStart > windowMs * 2) requestRateState.delete(itemKey);
    }
  }
  return (requestRateState.get(key)?.count || 0) > maxCount;
}

function normalizeCommandText(text: string): string {
  return String(text || "").toLowerCase().replace(/\s+/g, "");
}

function isHandoffResumeCommand(text: string): boolean {
  return HANDOFF_RESUME_COMMANDS.has(normalizeCommandText(text));
}

export function registerWempWebhook(account: ResolvedWempAccount): RegisteredWebhook {
  for (const [pathname, item] of registeredByPath.entries()) {
    if (item.accountId === account.accountId && pathname !== account.webhookPath) {
      registeredByPath.delete(pathname);
    }
  }
  registeredByPath.set(account.webhookPath, account);
  return {
    path: account.webhookPath,
    accountId: account.accountId,
  };
}

export function unregisterWempWebhook(account: ResolvedWempAccount): void {
  const matched = registeredByPath.get(account.webhookPath);
  if (matched?.accountId === account.accountId) {
    registeredByPath.delete(account.webhookPath);
  }
}

export function unregisterWempWebhookByAccountId(accountId: string): void {
  const normalized = String(accountId || "").trim();
  if (!normalized) return;
  for (const [pathname, account] of registeredByPath.entries()) {
    if (account.accountId === normalized) {
      registeredByPath.delete(pathname);
    }
  }
}

export function resolveRegisteredWebhook(pathname: string): ResolvedWempAccount | null {
  return registeredByPath.get(pathname) || null;
}

export async function handleRegisteredWebhookRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const pathname = getPathname(req.url);
  const account = resolveRegisteredWebhook(pathname);
  if (!account) return false;
  const requireHttps = account.requireHttps === true || isTruthyEnv(process.env.WEMP_REQUIRE_HTTPS);
  if (requireHttps && !isHttpsRequest(req)) {
    logWarn("webhook_https_required", {
      accountId: account.accountId,
      path: pathname,
      method: String(req.method || "GET").toUpperCase(),
      xForwardedProto: req.headers["x-forwarded-proto"],
    });
    sendText(res, 403, "HTTPS required");
    return true;
  }
  const nowInFlight = (inFlightByAccount.get(account.accountId) || 0) + 1;
  inFlightByAccount.set(account.accountId, nowInFlight);
  logInfo("webhook_request_in", {
    accountId: account.accountId,
    method: String(req.method || "GET").toUpperCase(),
    path: pathname,
    inFlight: nowInFlight,
  });
  if (nowInFlight > MAX_IN_FLIGHT_PER_ACCOUNT) {
    logWarn("webhook_overloaded", {
      accountId: account.accountId,
      inFlight: nowInFlight,
      limit: MAX_IN_FLIGHT_PER_ACCOUNT,
    });
    sendText(res, 503, "Busy");
    inFlightByAccount.set(account.accountId, Math.max(0, nowInFlight - 1));
    return true;
  }
  try {
    await handleWebhookRequest(account, req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`[wemp:${account.accountId}] webhook handler failed`, message);
    markRuntimeError(account.accountId, `webhook_failed:${message}`);
    if (res.writableEnded || res.destroyed) return true;
    if (message === "Invalid message signature") {
      sendText(res, 403, "Invalid signature");
      return true;
    }
    sendText(res, 500, "Internal Server Error");
  } finally {
    const current = inFlightByAccount.get(account.accountId) || 0;
    inFlightByAccount.set(account.accountId, Math.max(0, current - 1));
  }
  return true;
}

function extractEncrypted(xml: string): string {
  const matched = /<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/s.exec(xml)?.[1];
  return matched || "";
}

function respondWechat(account: ResolvedWempAccount, res: ServerResponse, replyXml: string, timestamp: string, nonce: string): void {
  if (account.encodingAESKey) {
    sendText(res, 200, buildEncryptedReply({ xml: replyXml, token: account.token, encodingAESKey: account.encodingAESKey, appId: account.appId, timestamp, nonce }), "application/xml; charset=utf-8");
    return;
  }
  sendText(res, 200, replyXml, "application/xml; charset=utf-8");
}

function buildPairingGuideText(accountId: string, openId: string): string {
  const pairing = requestPairing(accountId, openId);
  const remainingMs = Math.max(0, pairing.expireAt - Date.now());
  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return [
    "当前 AI 助手未开启，请先完成配对后继续使用。",
    `配对码：${pairing.code}（约 ${remainingMinutes} 分钟内有效）`,
    `审批提示：${pairing.hint}`,
  ].join("\n");
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function handleWebhookRequest(account: ResolvedWempAccount, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const pathname = getPathname(req.url);
  if (pathname !== account.webhookPath) {
    sendText(res, 404, "Not Found");
    return;
  }

  const params = getSearchParams(req.url);
  const signature = params.get("signature") || "";
  const msgSignature = params.get("msg_signature") || "";
  const timestamp = params.get("timestamp") || String(Math.floor(Date.now() / 1000));
  const nonce = params.get("nonce") || "";
  const echostr = params.get("echostr") || "";

  if (account.encodingAESKey) {
    if ((req.method || "GET").toUpperCase() === "GET") {
      if (!verifySignature(signature, timestamp, nonce, account.token)) {
        sendText(res, 403, "Invalid signature");
        return;
      }
      sendText(res, 200, echostr);
      return;
    }
  } else if (!verifySignature(signature || msgSignature, timestamp, nonce, account.token)) {
    sendText(res, 403, "Invalid signature");
    return;
  }

  const rawBody = await readRequestBody(req);
  const body = account.encodingAESKey
    ? (() => {
        const encrypted = extractEncrypted(rawBody);
        if (!encrypted || !verifyMessageSignature(msgSignature, timestamp, nonce, encrypted, account.token)) throw new Error("Invalid message signature");
        return decryptWechatMessage(encrypted, account.encodingAESKey!, account.appId);
      })()
    : rawBody;

  const parsed = parseWechatMessage(body);
  const dedupKey = buildDedupKey({
    accountId: account.accountId,
    openId: parsed.fromUserName,
    msgId: parsed.msgId,
    event: parsed.event,
    eventKey: parsed.eventKey,
    createTime: parsed.createTime,
  });
  if (!markIfNew(dedupKey)) {
    sendText(res, 200, "success");
    return;
  }
  if (isOverRequestRateLimit(account.accountId, parsed.fromUserName)) {
    logWarn("webhook_rate_limited", {
      accountId: account.accountId,
      openId: parsed.fromUserName,
      windowMs: REQUEST_RATE_LIMIT_WINDOW_MS,
      maxCount: REQUEST_RATE_LIMIT_MAX,
    });
    const replyXml = buildPassiveTextReply(parsed.fromUserName, parsed.toUserName, "请求过于频繁，请稍后再试。");
    respondWechat(account, res, replyXml, timestamp, nonce);
    return;
  }
  markRuntimeInbound(account.accountId);

  if (parsed.msgType === "event") {
    const event = (parsed.event || "").toLowerCase();
    if (event === "subscribe") {
      const { replyText } = handleSubscribeEvent(account, parsed.fromUserName);
      const replyXml = buildPassiveTextReply(parsed.fromUserName, parsed.toUserName, replyText);
      respondWechat(account, res, replyXml, timestamp, nonce);
      return;
    }
    if (event === "unsubscribe") {
      handleUnsubscribeEvent(account.accountId, parsed.fromUserName);
      sendText(res, 200, "success");
      return;
    }
    const action = handleEventAction(account, parsed);
    if (action.handled) {
      const replyXml = buildPassiveTextReply(parsed.fromUserName, parsed.toUserName, action.replyText || "操作已处理。");
      respondWechat(account, res, replyXml, timestamp, nonce);
      return;
    }
  }

  if (parsed.msgType === "text" && isHandoffResumeCommand(parsed.content || "")) {
    const state = getHandoffState(account.accountId, parsed.fromUserName);
    if (state.active) {
      clearHandoffState(account.accountId, parsed.fromUserName);
      const now = Date.now();
      const ticketDelivery = resolveHandoffTicketDelivery("resumed", account.features.handoff.ticketWebhook);
      emitHandoffNotification({
        id: `resumed:${account.accountId}:${parsed.fromUserName}:${now}`,
        type: "resumed",
        accountId: account.accountId,
        openId: parsed.fromUserName,
        at: now,
        reason: "command",
        ...(ticketDelivery ? { deliveries: { ticket: ticketDelivery } } : {}),
      });
      const replyXml = buildPassiveTextReply(parsed.fromUserName, parsed.toUserName, "已恢复 AI 助手服务。");
      respondWechat(account, res, replyXml, timestamp, nonce);
      return;
    }
  }

  const handoffState = getHandoffState(account.accountId, parsed.fromUserName);
  if (handoffState.active) {
    const remainMinutes = Math.max(1, Math.ceil(Math.max(0, (handoffState.expireAt || Date.now()) - Date.now()) / 60_000));
    const handoffReply = account.features.handoff.activeReply || "当前会话已转人工处理，请稍候。";
    const replyXml = buildPassiveTextReply(
      parsed.fromUserName,
      parsed.toUserName,
      `${handoffReply}\n预计 ${remainMinutes} 分钟后自动恢复 AI，可发送“恢复AI”立即恢复。`,
    );
    respondWechat(account, res, replyXml, timestamp, nonce);
    return;
  }

  const baseInboundText = normalizeInboundText(parsed);
  const mediaSummary = await buildInboundMediaSummary(account, parsed);
  const normalizedText = sanitizeInboundUserText(mediaSummary ? `${baseInboundText}\n${mediaSummary}` : baseInboundText);
  const result = await withTimeout(handleInboundMessage(account, {
    openId: parsed.fromUserName,
    text: normalizedText,
  }), INBOUND_TIMEOUT_MS);
  if (!result) {
    logWarn("webhook_inbound_timeout", {
      accountId: account.accountId,
      timeoutMs: INBOUND_TIMEOUT_MS,
    });
    const replyXml = buildPassiveTextReply(parsed.fromUserName, parsed.toUserName, "消息已收到，系统正在处理，请稍后重试。");
    respondWechat(account, res, replyXml, timestamp, nonce);
    return;
  }

  if (result.usageExceeded) {
    const replyXml = buildPassiveTextReply(parsed.fromUserName, parsed.toUserName, "今日使用次数已达上限，请稍后再试或完成配对后继续使用。");
    respondWechat(account, res, replyXml, timestamp, nonce);
    return;
  }

  if (!result.assistantEnabled && !result.paired) {
    const replyXml = buildPassiveTextReply(parsed.fromUserName, parsed.toUserName, buildPairingGuideText(account.accountId, parsed.fromUserName));
    respondWechat(account, res, replyXml, timestamp, nonce);
    return;
  }

  const dispatched = await withTimeout(dispatchToAgent({
    channel: "wemp",
    accountId: account.accountId,
    openId: parsed.fromUserName,
    agentId: result.agentId,
    text: result.text,
    messageId: parsed.msgId,
  }), DISPATCH_TIMEOUT_MS);
  if (!dispatched) {
    logWarn("webhook_dispatch_timeout", {
      accountId: account.accountId,
      timeoutMs: DISPATCH_TIMEOUT_MS,
    });
    const replyXml = buildPassiveTextReply(parsed.fromUserName, parsed.toUserName, "消息已收到，系统正在处理，请稍后重试。");
    respondWechat(account, res, replyXml, timestamp, nonce);
    return;
  }

  if (!dispatched.accepted) {
    markRuntimeError(account.accountId, dispatched.note || "dispatch_inbound_rejected");
    const replyXml = buildPassiveTextReply(parsed.fromUserName, parsed.toUserName, "消息已收到，系统正在处理，请稍后重试。");
    respondWechat(account, res, replyXml, timestamp, nonce);
    return;
  }

  markRuntimeError(account.accountId, null);
  sendText(res, 200, "success");
}
