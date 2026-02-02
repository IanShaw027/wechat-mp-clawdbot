/**
 * 微信公众号二维码 API
 * 用于创建带参二维码
 */
import { getAccessToken, safeFetch } from "../api.js";
import { DEFAULT_FETCH_TIMEOUT_MS } from "../constants.js";
import type { ResolvedWechatMpAccount } from "../types.js";
import { type Result, ok, err } from "../result.js";

const API_BASE = "https://api.weixin.qq.com";

/**
 * 二维码类型
 */
export type QRCodeType =
  | "QR_SCENE"
  | "QR_STR_SCENE"
  | "QR_LIMIT_SCENE"
  | "QR_LIMIT_STR_SCENE";

/**
 * 二维码结果
 */
export interface QRCodeResult {
  ticket: string;
  expireSeconds?: number;
  url: string;
}

/**
 * 创建带参二维码
 */
export async function createQRCode(
  account: ResolvedWechatMpAccount,
  options: {
    type: QRCodeType;
    sceneId?: number;
    sceneStr?: string;
    expireSeconds?: number;
  }
): Promise<Result<QRCodeResult>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/qrcode/create?access_token=${accessToken}`;

    const body: Record<string, unknown> = {
      action_name: options.type,
    };

    if (options.expireSeconds && !options.type.includes("LIMIT")) {
      body.expire_seconds = options.expireSeconds;
    }

    const sceneInfo: Record<string, unknown> = {};
    if (options.sceneId !== undefined) {
      sceneInfo.scene_id = options.sceneId;
    }
    if (options.sceneStr !== undefined) {
      sceneInfo.scene_str = options.sceneStr;
    }
    body.action_info = { scene: sceneInfo };

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      ticket?: string;
      expire_seconds?: number;
      url?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    if (!data.ticket) {
      return err("创建二维码成功但未返回 ticket");
    }

    return ok({
      ticket: data.ticket,
      expireSeconds: data.expire_seconds,
      url: data.url || "",
    });
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 通过 ticket 获取二维码图片 URL
 */
export function getQRCodeImageUrl(ticket: string): string {
  return `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(ticket)}`;
}

/**
 * 批量创建渠道二维码
 */
export async function createChannelQRCodes(
  account: ResolvedWechatMpAccount,
  channels: Array<{ name: string; sceneStr: string }>
): Promise<Result<Array<{ name: string; sceneStr: string; ticket: string; imageUrl: string }>>> {
  try {
    const results: Array<{ name: string; sceneStr: string; ticket: string; imageUrl: string }> = [];

    for (const channel of channels) {
      const result = await createQRCode(account, {
        type: "QR_LIMIT_STR_SCENE",
        sceneStr: channel.sceneStr,
      });

      if (result.success) {
        results.push({
          name: channel.name,
          sceneStr: channel.sceneStr,
          ticket: result.data.ticket,
          imageUrl: getQRCodeImageUrl(result.data.ticket),
        });
      }
    }

    return ok(results);
  } catch (error) {
    return err(String(error));
  }
}
