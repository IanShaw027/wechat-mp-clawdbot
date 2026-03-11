import type { ResolvedWempAccount } from "./types.js";
import {
  sendCustomFileMessage,
  sendCustomImageMessage,
  sendCustomTextMessage,
  sendCustomVideoMessage,
  sendCustomVoiceMessage,
  type WechatApiResult,
} from "./api.js";
import { markRuntimeError, markRuntimeOutbound } from "./status.js";

export interface OutboundSendResult {
  accountId: string;
  target: string;
  chunks: string[];
  results: WechatApiResult[];
  ok: boolean;
}

export interface OutboundMediaSendResult {
  accountId: string;
  target: string;
  mediaType: "image" | "voice" | "video" | "file";
  mediaId: string;
  result: WechatApiResult;
  ok: boolean;
}

interface OutboundRetryOptions {
  maxRetries: number;
  retryDelayMs: number;
}

const DEFAULT_OUTBOUND_MAX_RETRIES = 1;
const DEFAULT_OUTBOUND_RETRY_DELAY_MS = 500;
const MAX_OUTBOUND_MAX_RETRIES = 5;
const MAX_OUTBOUND_RETRY_DELAY_MS = 60_000;
const outboundQueueTails = new Map<string, Promise<void>>();
type OutboundMediaType = "image" | "voice" | "video" | "file";

export function chunkText(text: string, limit = 600): string[] {
  const value = String(text || "");
  if (value.length <= limit) return [value];
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += limit) chunks.push(value.slice(i, i + limit));
  return chunks;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || "unknown_error";
  if (typeof error === "string") return error;
  if (error === null || error === undefined) return "unknown_error";
  return String(error);
}

function toApiFailure(prefix: string, result?: WechatApiResult): string {
  return `${prefix}:${result?.errcode ?? "unknown"}:${result?.errmsg ?? "unknown"}`;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function toInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pickInteger(values: unknown[], fallback: number, min: number, max: number): number {
  for (const value of values) {
    const parsed = toInteger(value);
    if (parsed === null) continue;
    return clampInteger(parsed, min, max);
  }
  return clampInteger(fallback, min, max);
}

function resolveRetryOptions(account: ResolvedWempAccount): OutboundRetryOptions {
  const accountConfig = toRecord(account.config);
  const outboundConfig = toRecord(accountConfig.outbound);
  const maxRetries = pickInteger(
    [
      outboundConfig.retryTimes,
      outboundConfig.retryCount,
      outboundConfig.retries,
      accountConfig.outboundRetryTimes,
      accountConfig.outboundRetryCount,
      accountConfig.outboundRetries,
      process.env.WEMP_OUTBOUND_RETRY_TIMES,
      process.env.WEMP_OUTBOUND_RETRY_COUNT,
      process.env.WEMP_OUTBOUND_RETRIES,
    ],
    DEFAULT_OUTBOUND_MAX_RETRIES,
    0,
    MAX_OUTBOUND_MAX_RETRIES,
  );
  const retryDelayMs = pickInteger(
    [
      outboundConfig.retryDelayMs,
      outboundConfig.retryDelay,
      accountConfig.outboundRetryDelayMs,
      accountConfig.outboundRetryDelay,
      process.env.WEMP_OUTBOUND_RETRY_DELAY_MS,
      process.env.WEMP_OUTBOUND_RETRY_DELAY,
    ],
    DEFAULT_OUTBOUND_RETRY_DELAY_MS,
    0,
    MAX_OUTBOUND_RETRY_DELAY_MS,
  );
  return { maxRetries, retryDelayMs };
}

function buildQueueKey(accountId: string, target: string): string {
  return JSON.stringify([accountId, target]);
}

function delay(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

async function enqueueTargetSend<T>(accountId: string, target: string, task: () => Promise<T>): Promise<T> {
  const queueKey = buildQueueKey(accountId, target);
  const previousTail = outboundQueueTails.get(queueKey) ?? Promise.resolve();
  let releaseCurrentTail: (() => void) | undefined;
  const currentTail = new Promise<void>((resolve) => {
    releaseCurrentTail = resolve;
  });
  const nextTail = previousTail.catch(() => undefined).then(() => currentTail);
  outboundQueueTails.set(queueKey, nextTail);

  await previousTail.catch(() => undefined);
  try {
    return await task();
  } finally {
    releaseCurrentTail?.();
    if (outboundQueueTails.get(queueKey) === nextTail) {
      outboundQueueTails.delete(queueKey);
    }
  }
}

async function sendWithRetry(sender: () => Promise<WechatApiResult>, options: OutboundRetryOptions): Promise<WechatApiResult> {
  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    try {
      const result = await sender();
      if (result.ok || attempt === options.maxRetries) {
        if (attempt > 0) result.retried = true;
        return result;
      }
    } catch (error) {
      if (attempt === options.maxRetries) throw error;
    }
    await delay(options.retryDelayMs);
  }
  return { ok: false, errcode: -1, errmsg: "outbound_retry_exhausted", retried: options.maxRetries > 0 };
}

export async function sendText(account: ResolvedWempAccount, target: string, text: string): Promise<OutboundSendResult> {
  return enqueueTargetSend(account.accountId, target, async () => {
    const chunks = chunkText(text);
    const results: WechatApiResult[] = [];
    const retryOptions = resolveRetryOptions(account);
    try {
      for (const chunk of chunks) {
        results.push(await sendWithRetry(() => sendCustomTextMessage(account, target, chunk), retryOptions));
      }
      const ok = results.every((item) => item.ok);
      markRuntimeOutbound(account.accountId);
      if (ok) {
        markRuntimeError(account.accountId, null);
      } else {
        const firstFailed = results.find((item) => !item.ok);
        markRuntimeError(account.accountId, toApiFailure("outbound_text_failed", firstFailed));
      }
      return {
        accountId: account.accountId,
        target,
        chunks,
        results,
        ok,
      };
    } catch (error) {
      markRuntimeOutbound(account.accountId);
      markRuntimeError(account.accountId, `outbound_text_failed:exception:${toErrorMessage(error)}`);
      throw error;
    }
  });
}

export async function sendImageByMediaId(
  account: ResolvedWempAccount,
  target: string,
  mediaId: string,
): Promise<OutboundMediaSendResult> {
  return sendMediaByMediaId(account, target, mediaId, "image", () => sendCustomImageMessage(account, target, mediaId));
}

export async function sendVoiceByMediaId(
  account: ResolvedWempAccount,
  target: string,
  mediaId: string,
): Promise<OutboundMediaSendResult> {
  return sendMediaByMediaId(account, target, mediaId, "voice", () => sendCustomVoiceMessage(account, target, mediaId));
}

export async function sendVideoByMediaId(
  account: ResolvedWempAccount,
  target: string,
  mediaId: string,
): Promise<OutboundMediaSendResult> {
  return sendMediaByMediaId(account, target, mediaId, "video", () => sendCustomVideoMessage(account, target, mediaId));
}

export async function sendFileByMediaId(
  account: ResolvedWempAccount,
  target: string,
  mediaId: string,
): Promise<OutboundMediaSendResult> {
  return sendMediaByMediaId(account, target, mediaId, "file", () => sendCustomFileMessage(account, target, mediaId));
}

async function sendMediaByMediaId(
  account: ResolvedWempAccount,
  target: string,
  mediaId: string,
  mediaType: OutboundMediaType,
  sender: () => Promise<WechatApiResult>,
): Promise<OutboundMediaSendResult> {
  return enqueueTargetSend(account.accountId, target, async () => {
    try {
      const retryOptions = resolveRetryOptions(account);
      const result = await sendWithRetry(sender, retryOptions);
      markRuntimeOutbound(account.accountId);
      if (result.ok) {
        markRuntimeError(account.accountId, null);
      } else {
        markRuntimeError(account.accountId, toApiFailure(`outbound_${mediaType}_failed`, result));
      }
      return {
        accountId: account.accountId,
        target,
        mediaType,
        mediaId,
        result,
        ok: result.ok,
      };
    } catch (error) {
      markRuntimeOutbound(account.accountId);
      markRuntimeError(account.accountId, `outbound_${mediaType}_failed:exception:${toErrorMessage(error)}`);
      throw error;
    }
  });
}
