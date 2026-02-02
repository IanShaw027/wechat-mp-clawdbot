/**
 * 微信公众号群发消息 API
 * 用于群发消息
 */
import { getAccessToken, safeFetch } from "../api.js";
import { DEFAULT_FETCH_TIMEOUT_MS } from "../constants.js";
import type { ResolvedWechatMpAccount } from "../types.js";
import { type Result, ok, err } from "../result.js";

const API_BASE = "https://api.weixin.qq.com";

/**
 * 群发内容类型
 */
export interface MassContent {
  type: "mpnews" | "text" | "voice" | "image" | "mpvideo";
  mediaId?: string;
  text?: string;
}

/**
 * 群发结果
 */
export interface MassResult {
  msgId: number;
  msgDataId?: number;
}

/**
 * 按标签群发
 */
export async function massSendByTag(
  account: ResolvedWechatMpAccount,
  tagId: number | null,
  content: MassContent,
  options?: {
    sendIgnoreReprint?: 0 | 1;
    clientMsgId?: string;
  }
): Promise<Result<MassResult>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/message/mass/sendall?access_token=${accessToken}`;

    const body: Record<string, unknown> = {
      filter: {
        is_to_all: tagId === null,
        tag_id: tagId,
      },
      msgtype: content.type,
    };

    if (content.type === "text") {
      body.text = { content: content.text };
    } else {
      body[content.type] = { media_id: content.mediaId };
    }

    if (options?.sendIgnoreReprint !== undefined) {
      body.send_ignore_reprint = options.sendIgnoreReprint;
    }
    if (options?.clientMsgId) {
      body.clientmsgid = options.clientMsgId;
    }

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      msg_id?: number;
      msg_data_id?: number;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok({
      msgId: data.msg_id || 0,
      msgDataId: data.msg_data_id,
    });
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 按 OpenID 列表群发
 */
export async function massSendByOpenIds(
  account: ResolvedWechatMpAccount,
  openIds: string[],
  content: MassContent,
  options?: {
    sendIgnoreReprint?: 0 | 1;
    clientMsgId?: string;
  }
): Promise<Result<MassResult>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/message/mass/send?access_token=${accessToken}`;

    const body: Record<string, unknown> = {
      touser: openIds,
      msgtype: content.type,
    };

    if (content.type === "text") {
      body.text = { content: content.text };
    } else {
      body[content.type] = { media_id: content.mediaId };
    }

    if (options?.sendIgnoreReprint !== undefined) {
      body.send_ignore_reprint = options.sendIgnoreReprint;
    }
    if (options?.clientMsgId) {
      body.clientmsgid = options.clientMsgId;
    }

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      msg_id?: number;
      msg_data_id?: number;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok({
      msgId: data.msg_id || 0,
      msgDataId: data.msg_data_id,
    });
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 预览消息
 */
export async function previewMessage(
  account: ResolvedWechatMpAccount,
  openId: string,
  content: MassContent
): Promise<Result<number>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/message/mass/preview?access_token=${accessToken}`;

    const body: Record<string, unknown> = {
      touser: openId,
      msgtype: content.type,
    };

    if (content.type === "text") {
      body.text = { content: content.text };
    } else {
      body[content.type] = { media_id: content.mediaId };
    }

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      msg_id?: number;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok(data.msg_id || 0);
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 删除群发消息
 */
export async function deleteMassMessage(
  account: ResolvedWechatMpAccount,
  msgId: number,
  articleIdx?: number
): Promise<Result<void>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/message/mass/delete?access_token=${accessToken}`;

    const body: Record<string, unknown> = { msg_id: msgId };
    if (articleIdx !== undefined) {
      body.article_idx = articleIdx;
    }

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as { errcode?: number; errmsg?: string };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok(undefined);
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 群发状态
 */
export type MassMessageStatus = "SEND_SUCCESS" | "SENDING" | "SEND_FAIL" | "DELETE";

/**
 * 查询群发状态
 */
export async function getMassMessageStatus(
  account: ResolvedWechatMpAccount,
  msgId: number
): Promise<Result<{ msgId: number; msgStatus: MassMessageStatus }>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/message/mass/get?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msg_id: msgId }),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      msg_id?: number;
      msg_status?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok({
      msgId: data.msg_id || msgId,
      msgStatus: (data.msg_status || "SEND_FAIL") as MassMessageStatus,
    });
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 获取群发速度
 */
export async function getMassSpeed(
  account: ResolvedWechatMpAccount
): Promise<Result<{ speed: number; realspeed: number }>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/message/mass/speed/get?access_token=${accessToken}`;

    const response = await safeFetch(url, { method: "POST" }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });
    const data = await response.json() as {
      speed?: number;
      realspeed?: number;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok({
      speed: data.speed || 0,
      realspeed: data.realspeed || 0,
    });
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 设置群发速度
 */
export async function setMassSpeed(
  account: ResolvedWechatMpAccount,
  speed: 0 | 1 | 2 | 3 | 4
): Promise<Result<void>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/message/mass/speed/set?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speed }),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as { errcode?: number; errmsg?: string };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok(undefined);
  } catch (error) {
    return err(String(error));
  }
}
