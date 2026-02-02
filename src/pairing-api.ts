/**
 * 配对 API 模块
 * 处理配对 API 请求（POST /wemp/api/pair）
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import * as crypto from "node:crypto";
import type { ResolvedWechatMpAccount } from "./types.js";
import { verifyPairingCode, getPairingApiToken } from "./pairing.js";
import { sendCustomMessage } from "./api.js";

const MAX_PAIRING_API_BODY_BYTES = 32 * 1024; // 32KB (强安全)

// /api/pair 简单限流（按 remoteAddress）
const pairingApiRate = new Map<string, { count: number; resetAt: number }>();
const PAIRING_API_RATE_LIMIT = { windowMs: 60_000, max: 30 };

/**
 * 检查配对 API 速率限制
 */
function checkPairingApiRateLimit(req: IncomingMessage): { ok: true } | { ok: false; retryAfterSec: number } {
  const ip = req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const current = pairingApiRate.get(ip);
  if (!current || now > current.resetAt) {
    pairingApiRate.set(ip, { count: 1, resetAt: now + PAIRING_API_RATE_LIMIT.windowMs });
    return { ok: true };
  }

  current.count += 1;
  if (current.count > PAIRING_API_RATE_LIMIT.max) {
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  return { ok: true };
}

/**
 * 时间安全的字符串比较
 */
function timingSafeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * 读取请求体
 */
async function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error(`Request body too large (limit=${maxBytes})`));
        try {
          req.destroy();
        } catch {
          // ignore
        }
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      resolve(body);
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * 处理配对 API 请求
 * POST /wemp/api/pair
 * Body: { code: string, userId: string, userName?: string, channel?: string, token: string }
 */
export async function handlePairingApi(
  req: IncomingMessage,
  res: ServerResponse,
  account: ResolvedWechatMpAccount
): Promise<boolean> {
  try {
    const rate = checkPairingApiRateLimit(req);
    if (!rate.ok) {
      const retryAfter = (rate as { ok: false; retryAfterSec: number }).retryAfterSec;
      res.statusCode = 429;
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Too Many Requests" }));
      return true;
    }

    let rawBody = "";
    try {
      rawBody = await readBody(req, MAX_PAIRING_API_BODY_BYTES);
    } catch (err) {
      res.statusCode = String(err).includes("too large") ? 413 : 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Bad Request" }));
      return true;
    }

    let body: {
      code?: string;
      userId?: string;
      userName?: string;
      channel?: string;
      token?: string;
    };
    try {
      body = JSON.parse(rawBody) as any;
    } catch {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return true;
    }

    // 验证 token
    const expectedToken = getPairingApiToken(account.accountId);
    if (!expectedToken) {
      // 强安全：没有显式配置则禁用此端点
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Not Found" }));
      return true;
    }
    if (!body.token || !timingSafeEqualString(body.token, expectedToken)) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return true;
    }

    if (!body.code || !body.userId) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Missing code or userId" }));
      return true;
    }

    const result = verifyPairingCode(body.code, body.userId, body.userName, body.channel);

    if (result) {
      // 通知微信用户配对成功
      await sendCustomMessage(
        account,
        result.openId,
        `🎉 配对成功！\n\n` +
          `已与 ${body.userName || body.userId} 绑定。\n` +
          `配对渠道: ${body.channel || "未知"}\n\n` +
          `现在你可以使用完整的 AI 助手功能了。`
      );

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, openId: result.openId }));
    } else {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid or expired code" }));
    }
  } catch (err) {
    console.error(`[wemp:${account.accountId}] 配对 API 错误:`, err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Internal server error" }));
  }

  return true;
}
