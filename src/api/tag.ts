/**
 * 微信公众号标签管理 API
 * 用于管理用户标签
 */
import { getAccessToken, safeFetch } from "../api.js";
import type { ResolvedWechatMpAccount } from "../types.js";
import { type Result, ok, err } from "../result.js";
import { DEFAULT_FETCH_TIMEOUT_MS } from "../constants.js";

const API_BASE = "https://api.weixin.qq.com";

/**
 * 标签信息
 */
export interface Tag {
  id: number;
  name: string;
  count?: number;
}

/**
 * 创建标签
 */
export async function createTag(
  account: ResolvedWechatMpAccount,
  name: string
): Promise<Result<Tag>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/tags/create?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: { name } }),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      tag?: { id: number; name: string };
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    if (!data.tag) {
      return err("创建标签成功但未返回标签信息");
    }

    return ok({ id: data.tag.id, name: data.tag.name });
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 获取标签列表
 */
export async function getTags(
  account: ResolvedWechatMpAccount
): Promise<Result<Tag[]>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/tags/get?access_token=${accessToken}`;

    const response = await safeFetch(url, undefined, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });
    const data = await response.json() as {
      tags?: Array<{ id: number; name: string; count: number }>;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    const tags = data.tags?.map(t => ({
      id: t.id,
      name: t.name,
      count: t.count,
    })) || [];

    return ok(tags);
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 编辑标签
 */
export async function updateTag(
  account: ResolvedWechatMpAccount,
  tagId: number,
  name: string
): Promise<Result<void>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/tags/update?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: { id: tagId, name } }),
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
 * 删除标签
 */
export async function deleteTag(
  account: ResolvedWechatMpAccount,
  tagId: number
): Promise<Result<void>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/tags/delete?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: { id: tagId } }),
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
 * 批量为用户打标签
 * 每次最多 50 个用户
 */
export async function batchTagUsers(
  account: ResolvedWechatMpAccount,
  tagId: number,
  openIds: string[]
): Promise<Result<void>> {
  try {
    if (openIds.length > 50) {
      return err("每次最多为 50 个用户打标签");
    }

    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/tags/members/batchtagging?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openid_list: openIds, tagid: tagId }),
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
 * 批量为用户取消标签
 */
export async function batchUntagUsers(
  account: ResolvedWechatMpAccount,
  tagId: number,
  openIds: string[]
): Promise<Result<void>> {
  try {
    if (openIds.length > 50) {
      return err("每次最多为 50 个用户取消标签");
    }

    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/tags/members/batchuntagging?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openid_list: openIds, tagid: tagId }),
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
 * 获取用户的标签列表
 */
export async function getUserTags(
  account: ResolvedWechatMpAccount,
  openId: string
): Promise<Result<number[]>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/tags/getidlist?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openid: openId }),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      tagid_list?: number[];
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok(data.tagid_list || []);
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 获取标签下的用户列表
 */
export async function getTagUsers(
  account: ResolvedWechatMpAccount,
  tagId: number,
  nextOpenId?: string
): Promise<Result<{ count: number; openIds: string[]; nextOpenId?: string }>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/user/tag/get?access_token=${accessToken}`;

    const body: Record<string, unknown> = { tagid: tagId };
    if (nextOpenId) {
      body.next_openid = nextOpenId;
    }

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      count?: number;
      data?: { openid: string[] };
      next_openid?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok({
      count: data.count || 0,
      openIds: data.data?.openid || [],
      nextOpenId: data.next_openid,
    });
  } catch (error) {
    return err(String(error));
  }
}
