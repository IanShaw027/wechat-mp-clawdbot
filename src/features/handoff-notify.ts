import { readJsonFile, writeJsonFile } from "../storage.js";
import type { WempHandoffTicketWebhookConfig } from "../types.js";

const HANDOFF_NOTIFY_FILE = "handoff-notify.json";
const DEFAULT_NOTIFY_TIMEOUT_MS = 3_000;
const DEFAULT_NOTIFY_RETRIES = 1;
const DEFAULT_NOTIFY_BATCH_SIZE = 20;

export interface HandoffNotificationDeliveryTarget {
  endpoint: string;
  token?: string;
}

export interface HandoffNotificationDeliveryTargets {
  ticket?: HandoffNotificationDeliveryTarget;
}

export interface HandoffNotification {
  id: string;
  type: "activated" | "resumed";
  accountId: string;
  openId: string;
  at: number;
  contact?: string;
  expireAt?: number;
  reason?: string;
  deliveries?: HandoffNotificationDeliveryTargets;
}

export interface HandoffNotifyFlushResult {
  attempted: number;
  delivered: number;
  failed: number;
  remaining: number;
  skipped: boolean;
}

const notifyQueue = readJsonFile<HandoffNotification[]>(HANDOFF_NOTIFY_FILE, []);

function persistNotifyQueue(): void {
  writeJsonFile(HANDOFF_NOTIFY_FILE, notifyQueue);
}

function parsePositiveInt(raw: string | undefined, fallback: number, min = 0): number {
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
}

function notifyEndpoint(): string {
  return String(
    process.env.WEMP_HANDOFF_NOTIFY_ENDPOINT
    || process.env.WEMP_HANDOFF_WEBHOOK
    || process.env.WEMP_HANDOFF_ENDPOINT
    || "",
  ).trim();
}

function notifyAuthToken(): string {
  return String(
    process.env.WEMP_HANDOFF_NOTIFY_TOKEN
    || process.env.WEMP_HANDOFF_API_KEY
    || "",
  ).trim();
}

function parseTicketEvents(raw: string | undefined): Array<"activated" | "resumed"> {
  const normalized = String(raw || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const events = normalized.filter((event): event is "activated" | "resumed" => event === "activated" || event === "resumed");
  return events.length ? Array.from(new Set(events)) : ["activated"];
}

function ticketEndpoint(): string {
  return String(
    process.env.WEMP_HANDOFF_TICKET_ENDPOINT
    || process.env.WEMP_HANDOFF_TICKET_WEBHOOK
    || "",
  ).trim();
}

function ticketAuthToken(): string {
  return String(
    process.env.WEMP_HANDOFF_TICKET_TOKEN
    || process.env.WEMP_HANDOFF_TICKET_API_KEY
    || "",
  ).trim();
}

function ticketEvents(): Array<"activated" | "resumed"> {
  return parseTicketEvents(process.env.WEMP_HANDOFF_TICKET_EVENTS);
}

async function postHandoffNotificationWithRetry(
  endpoint: string,
  event: string,
  authToken: string | undefined,
  notification: HandoffNotification,
  timeoutMs: number,
  retries: number,
): Promise<boolean> {
  const payload = {
    channel: "wemp",
    event,
    data: notification,
  };

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (response.ok) return true;
    } catch {
      // Best-effort delivery: keep notification in queue and retry later.
    } finally {
      clearTimeout(timer);
    }
  }

  return false;
}

export function resolveHandoffTicketDelivery(
  type: HandoffNotification["type"],
  cfg?: WempHandoffTicketWebhookConfig | null,
): HandoffNotificationDeliveryTarget | null {
  const configEnabled = cfg?.enabled === true;
  const configEvents = Array.isArray(cfg?.events) ? cfg.events : [];
  if (configEnabled) {
    const endpoint = String(cfg?.endpoint || "").trim();
    if (endpoint && (configEvents.length === 0 || configEvents.includes(type))) {
      const token = String(cfg?.token || "").trim();
      return {
        endpoint,
        ...(token ? { token } : {}),
      };
    }
  }

  const endpoint = ticketEndpoint();
  if (!endpoint) return null;
  if (!ticketEvents().includes(type)) return null;
  const token = ticketAuthToken();
  return {
    endpoint,
    ...(token ? { token } : {}),
  };
}

export function emitHandoffNotification(notification: HandoffNotification): void {
  notifyQueue.push(notification);
  if (notifyQueue.length > 1000) {
    notifyQueue.splice(0, notifyQueue.length - 1000);
  }
  persistNotifyQueue();
}

export function consumeHandoffNotifications(limit = 20): HandoffNotification[] {
  const count = Math.max(1, Math.floor(limit));
  const picked = notifyQueue.splice(0, count);
  persistNotifyQueue();
  return picked;
}

export async function flushHandoffNotificationsToExternal(limit = DEFAULT_NOTIFY_BATCH_SIZE): Promise<HandoffNotifyFlushResult> {
  const endpoint = notifyEndpoint();
  const authToken = notifyAuthToken();
  if (!endpoint && notifyQueue.every((item) => !item.deliveries?.ticket) && !ticketEndpoint()) {
    return {
      attempted: 0,
      delivered: 0,
      failed: 0,
      remaining: notifyQueue.length,
      skipped: true,
    };
  }

  const timeoutMs = parsePositiveInt(process.env.WEMP_HANDOFF_NOTIFY_TIMEOUT_MS, DEFAULT_NOTIFY_TIMEOUT_MS, 500);
  const retries = parsePositiveInt(process.env.WEMP_HANDOFF_NOTIFY_RETRIES, DEFAULT_NOTIFY_RETRIES, 0);
  const maxBatch = Math.max(1, Math.floor(limit || DEFAULT_NOTIFY_BATCH_SIZE));

  let attempted = 0;
  let delivered = 0;
  let failed = 0;

  while (attempted < maxBatch && notifyQueue.length > 0) {
    const notification = notifyQueue[0]!;
    attempted += 1;
    const destinations: Array<{ endpoint: string; event: string; token?: string }> = [];
    if (endpoint) {
      destinations.push({
        endpoint,
        event: "handoff_notification",
        ...(authToken ? { token: authToken } : {}),
      });
    }
    const ticketDelivery = notification.deliveries?.ticket || resolveHandoffTicketDelivery(notification.type, null);
    if (ticketDelivery?.endpoint) {
      destinations.push({
        endpoint: ticketDelivery.endpoint,
        event: "handoff_ticket",
        ...(ticketDelivery.token ? { token: ticketDelivery.token } : {}),
      });
    }
    if (destinations.length === 0) {
      delivered += 1;
      notifyQueue.shift();
      persistNotifyQueue();
      continue;
    }
    let ok = true;
    for (const destination of destinations) {
      const deliveredOk = await postHandoffNotificationWithRetry(
        destination.endpoint,
        destination.event,
        destination.token,
        notification,
        timeoutMs,
        retries,
      );
      if (!deliveredOk) {
        ok = false;
        break;
      }
    }
    if (ok) {
      delivered += 1;
      notifyQueue.shift();
      persistNotifyQueue();
      continue;
    }
    failed += 1;
    break;
  }

  return {
    attempted,
    delivered,
    failed,
    remaining: notifyQueue.length,
    skipped: false,
  };
}
