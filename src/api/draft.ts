/**
 * 微信公众号草稿箱 API
 * 用于管理公众号图文草稿
 */
import { getAccessToken, safeFetch } from "../api.js";
import type { ResolvedWechatMpAccount } from "../types.js";
import { type Result, ok, err } from "../result.js";
import { DEFAULT_FETCH_TIMEOUT_MS } from "../constants.js";

const API_BASE = "https://api.weixin.qq.com";

/**
 * 草稿文章结构
 */
export interface DraftArticle {
  title: string;
  author?: string;
  digest?: string;
  content: string;
  contentSourceUrl?: string;
  thumbMediaId: string;
  needOpenComment?: 0 | 1;
  onlyFansCanComment?: 0 | 1;
}

/**
 * 草稿列表项
 */
export interface DraftItem {
  mediaId: string;
  updateTime: number;
  articles: DraftArticle[];
}

/**
 * 新增草稿
 */
export async function addDraft(
  account: ResolvedWechatMpAccount,
  articles: DraftArticle[]
): Promise<Result<string>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/draft/add?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articles: articles.map(a => ({
          title: a.title,
          author: a.author || "",
          digest: a.digest || "",
          content: a.content,
          content_source_url: a.contentSourceUrl || "",
          thumb_media_id: a.thumbMediaId,
          need_open_comment: a.needOpenComment || 0,
          only_fans_can_comment: a.onlyFansCanComment || 0,
        })),
      }),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      media_id?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    if (!data.media_id) {
      return err("创建草稿成功但未返回 media_id");
    }

    return ok(data.media_id);
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 更新草稿
 */
export async function updateDraft(
  account: ResolvedWechatMpAccount,
  mediaId: string,
  index: number,
  article: Partial<DraftArticle>
): Promise<Result<void>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/draft/update?access_token=${accessToken}`;

    const articleData: Record<string, unknown> = {};
    if (article.title !== undefined) articleData.title = article.title;
    if (article.author !== undefined) articleData.author = article.author;
    if (article.digest !== undefined) articleData.digest = article.digest;
    if (article.content !== undefined) articleData.content = article.content;
    if (article.contentSourceUrl !== undefined) articleData.content_source_url = article.contentSourceUrl;
    if (article.thumbMediaId !== undefined) articleData.thumb_media_id = article.thumbMediaId;
    if (article.needOpenComment !== undefined) articleData.need_open_comment = article.needOpenComment;
    if (article.onlyFansCanComment !== undefined) articleData.only_fans_can_comment = article.onlyFansCanComment;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_id: mediaId,
        index,
        articles: articleData,
      }),
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
 * 获取草稿详情
 */
export async function getDraft(
  account: ResolvedWechatMpAccount,
  mediaId: string
): Promise<Result<DraftArticle[]>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/draft/get?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_id: mediaId }),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      news_item?: Array<{
        title: string;
        author: string;
        digest: string;
        content: string;
        content_source_url: string;
        thumb_media_id: string;
        need_open_comment: number;
        only_fans_can_comment: number;
      }>;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    const articles = data.news_item?.map(item => ({
      title: item.title,
      author: item.author,
      digest: item.digest,
      content: item.content,
      contentSourceUrl: item.content_source_url,
      thumbMediaId: item.thumb_media_id,
      needOpenComment: item.need_open_comment as 0 | 1,
      onlyFansCanComment: item.only_fans_can_comment as 0 | 1,
    })) || [];

    return ok(articles);
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 获取草稿列表
 */
export async function listDrafts(
  account: ResolvedWechatMpAccount,
  offset = 0,
  count = 20,
  noContent = false
): Promise<Result<{ totalCount: number; items: DraftItem[] }>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/draft/batchget?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offset, count, no_content: noContent ? 1 : 0 }),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      total_count?: number;
      item?: Array<{
        media_id: string;
        update_time: number;
        content: {
          news_item: Array<{
            title: string;
            author: string;
            digest: string;
            content: string;
            content_source_url: string;
            thumb_media_id: string;
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
      mediaId: item.media_id,
      updateTime: item.update_time,
      articles: item.content.news_item.map(a => ({
        title: a.title,
        author: a.author,
        digest: a.digest,
        content: a.content,
        contentSourceUrl: a.content_source_url,
        thumbMediaId: a.thumb_media_id,
      })),
    })) || [];

    return ok({ totalCount: data.total_count || 0, items });
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 删除草稿
 */
export async function deleteDraft(
  account: ResolvedWechatMpAccount,
  mediaId: string
): Promise<Result<void>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/draft/delete?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_id: mediaId }),
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
 * 获取草稿总数
 */
export async function getDraftCount(
  account: ResolvedWechatMpAccount
): Promise<Result<number>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/draft/count?access_token=${accessToken}`;

    const response = await safeFetch(url, undefined, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });
    const data = await response.json() as {
      total_count?: number;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok(data.total_count || 0);
  } catch (error) {
    return err(String(error));
  }
}
