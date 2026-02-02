/**
 * 微信公众号发布 API
 * 用于发布草稿和管理已发布文章
 */
import { getAccessToken, safeFetch } from "../api.js";
import type { ResolvedWechatMpAccount } from "../types.js";
import { type Result, ok, err } from "../result.js";
import { DEFAULT_FETCH_TIMEOUT_MS } from "../constants.js";

const API_BASE = "https://api.weixin.qq.com";

/**
 * 发布状态
 * 0: 成功
 * 1: 发布中
 * 2: 原创失败
 * 3: 常规失败
 * 4: 平台审核不通过
 * 5: 成功后用户删除所有文章
 * 6: 成功后系统封禁所有文章
 */
export type PublishStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * 发布状态描述
 */
export const PUBLISH_STATUS_TEXT: Record<PublishStatus, string> = {
  0: "发布成功",
  1: "发布中",
  2: "原创失败",
  3: "常规失败",
  4: "平台审核不通过",
  5: "成功后用户删除所有文章",
  6: "成功后系统封禁所有文章",
};

/**
 * 已发布文章信息
 */
export interface PublishedArticle {
  articleId: string;
  url: string;
  title?: string;
  isDeleted?: boolean;
}

/**
 * 发布结果
 */
export interface PublishResult {
  publishId: string;
}

/**
 * 发布状态结果
 */
export interface PublishStatusResult {
  publishId: string;
  status: PublishStatus;
  articleId?: string;
  articles?: PublishedArticle[];
  failIdx?: number[];
}

/**
 * 已发布文章列表项
 */
export interface PublishedItem {
  articleId: string;
  updateTime: number;
  articles: Array<{
    title: string;
    url: string;
    isDeleted: boolean;
  }>;
}

/**
 * 发布草稿
 */
export async function publishDraft(
  account: ResolvedWechatMpAccount,
  mediaId: string
): Promise<Result<string>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/freepublish/submit?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_id: mediaId }),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      publish_id?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    if (!data.publish_id) {
      return err("发布成功但未返回 publish_id");
    }

    return ok(data.publish_id);
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 查询发布状态
 */
export async function getPublishStatus(
  account: ResolvedWechatMpAccount,
  publishId: string
): Promise<Result<PublishStatusResult>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/freepublish/get?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publish_id: publishId }),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      publish_id?: string;
      publish_status?: number;
      article_id?: string;
      article_detail?: {
        count: number;
        item: Array<{
          idx: number;
          article_url: string;
        }>;
      };
      fail_idx?: number[];
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    const result: PublishStatusResult = {
      publishId: data.publish_id || publishId,
      status: (data.publish_status || 0) as PublishStatus,
      articleId: data.article_id,
      failIdx: data.fail_idx,
    };

    if (data.article_detail?.item) {
      result.articles = data.article_detail.item.map(item => ({
        articleId: data.article_id || "",
        url: item.article_url,
      }));
    }

    return ok(result);
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 获取已发布文章列表
 */
export async function listPublished(
  account: ResolvedWechatMpAccount,
  offset = 0,
  count = 20,
  noContent = false
): Promise<Result<{ totalCount: number; items: PublishedItem[] }>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/freepublish/batchget?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offset, count, no_content: noContent ? 1 : 0 }),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      total_count?: number;
      item?: Array<{
        article_id: string;
        update_time: number;
        content: {
          news_item: Array<{
            title: string;
            url: string;
            is_deleted: boolean;
          }>;
        };
      }>;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    const items = data.item?.map(item => ({
      articleId: item.article_id,
      updateTime: item.update_time,
      articles: item.content.news_item.map(a => ({
        title: a.title,
        url: a.url,
        isDeleted: a.is_deleted,
      })),
    })) || [];

    return ok({ totalCount: data.total_count || 0, items });
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 删除已发布文章
 */
export async function deletePublished(
  account: ResolvedWechatMpAccount,
  articleId: string,
  index?: number
): Promise<Result<void>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/freepublish/delete?access_token=${accessToken}`;

    const body: Record<string, unknown> = { article_id: articleId };
    if (index !== undefined) {
      body.index = index;
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
 * 获取已发布文章详情
 */
export async function getPublishedArticle(
  account: ResolvedWechatMpAccount,
  articleId: string
): Promise<Result<PublishedItem>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/freepublish/getarticle?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ article_id: articleId }),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      news_item?: Array<{
        title: string;
        url: string;
        is_deleted: boolean;
      }>;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok({
      articleId,
      updateTime: Date.now(),
      articles: data.news_item?.map(a => ({
        title: a.title,
        url: a.url,
        isDeleted: a.is_deleted,
      })) || [],
    });
  } catch (error) {
    return err(String(error));
  }
}
