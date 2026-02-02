/**
 * 微信公众号评论管理 API
 * 用于管理文章评论
 */
import { getAccessToken, safeFetch } from "../api.js";
import { DEFAULT_FETCH_TIMEOUT_MS } from "../constants.js";
import type { ResolvedWechatMpAccount } from "../types.js";
import { type Result, ok, err } from "../result.js";

const API_BASE = "https://api.weixin.qq.com";

/**
 * 评论信息
 */
export interface Comment {
  userCommentId: number;
  openId: string;
  createTime: number;
  content: string;
  commentType: 0 | 1;
  reply?: {
    content: string;
    createTime: number;
  };
}

/**
 * 获取文章评论列表
 */
export async function listComments(
  account: ResolvedWechatMpAccount,
  msgDataId: string,
  index: number,
  begin: number,
  count: number,
  type: 0 | 1
): Promise<Result<{ total: number; comments: Comment[] }>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/comment/list?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg_data_id: msgDataId,
        index,
        begin,
        count,
        type,
      }),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      total?: number;
      comment?: Array<{
        user_comment_id: number;
        openid: string;
        create_time: number;
        content: string;
        comment_type: number;
        reply?: {
          content: string;
          create_time: number;
        };
      }>;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    const comments = data.comment?.map(c => ({
      userCommentId: c.user_comment_id,
      openId: c.openid,
      createTime: c.create_time,
      content: c.content,
      commentType: c.comment_type as 0 | 1,
      reply: c.reply ? {
        content: c.reply.content,
        createTime: c.reply.create_time,
      } : undefined,
    })) || [];

    return ok({ total: data.total || 0, comments });
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 标记评论为精选
 */
export async function markCommentElect(
  account: ResolvedWechatMpAccount,
  msgDataId: string,
  index: number,
  userCommentId: number
): Promise<Result<void>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/comment/markelect?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg_data_id: msgDataId,
        index,
        user_comment_id: userCommentId,
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
 * 取消评论精选
 */
export async function unmarkCommentElect(
  account: ResolvedWechatMpAccount,
  msgDataId: string,
  index: number,
  userCommentId: number
): Promise<Result<void>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/comment/unmarkelect?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg_data_id: msgDataId,
        index,
        user_comment_id: userCommentId,
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
 * 删除评论
 */
export async function deleteComment(
  account: ResolvedWechatMpAccount,
  msgDataId: string,
  index: number,
  userCommentId: number
): Promise<Result<void>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/comment/delete?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg_data_id: msgDataId,
        index,
        user_comment_id: userCommentId,
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
 * 回复评论
 */
export async function replyComment(
  account: ResolvedWechatMpAccount,
  msgDataId: string,
  index: number,
  userCommentId: number,
  content: string
): Promise<Result<void>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/comment/reply/add?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg_data_id: msgDataId,
        index,
        user_comment_id: userCommentId,
        content,
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
 * 删除评论回复
 */
export async function deleteCommentReply(
  account: ResolvedWechatMpAccount,
  msgDataId: string,
  index: number,
  userCommentId: number
): Promise<Result<void>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/comment/reply/delete?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg_data_id: msgDataId,
        index,
        user_comment_id: userCommentId,
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
 * 打开文章评论
 */
export async function openComment(
  account: ResolvedWechatMpAccount,
  msgDataId: string,
  index?: number
): Promise<Result<void>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/comment/open?access_token=${accessToken}`;

    const body: Record<string, unknown> = { msg_data_id: msgDataId };
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
 * 关闭文章评论
 */
export async function closeComment(
  account: ResolvedWechatMpAccount,
  msgDataId: string,
  index?: number
): Promise<Result<void>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/comment/close?access_token=${accessToken}`;

    const body: Record<string, unknown> = { msg_data_id: msgDataId };
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

// ============ 自动回复规则 ============

/**
 * 自动回复规则
 */
export interface AutoReplyRule {
  ruleName: string;
  createTime: number;
  replyMode: "reply_all" | "random_one";
  keywordList: Array<{
    type: "text";
    matchMode: "contain" | "equal";
    content: string;
  }>;
  replyList: Array<{
    type: "text" | "img" | "voice" | "video" | "news";
    content?: string;
    newsInfo?: {
      list: Array<{
        title: string;
        author: string;
        digest: string;
        showCover: 0 | 1;
        coverUrl: string;
        contentUrl: string;
        sourceUrl: string;
      }>;
    };
  }>;
}

/**
 * 自动回复信息
 */
export interface AutoReplyInfo {
  isAddFriendReplyOpen: boolean;
  isAutoReplyOpen: boolean;
  addFriendAutoReply?: {
    type: string;
    content: string;
  };
  messageDefaultAutoReply?: {
    type: string;
    content: string;
  };
  keywordAutoReplyList: AutoReplyRule[];
}

/**
 * 获取自动回复规则
 */
export async function getAutoReplyRules(
  account: ResolvedWechatMpAccount
): Promise<Result<AutoReplyInfo>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/get_current_autoreply_info?access_token=${accessToken}`;

    const response = await safeFetch(url, undefined, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });
    const data = await response.json() as {
      is_add_friend_reply_open?: number;
      is_autoreply_open?: number;
      add_friend_autoreply_info?: {
        type: string;
        content: string;
      };
      message_default_autoreply_info?: {
        type: string;
        content: string;
      };
      keyword_autoreply_info?: {
        list: Array<{
          rule_name: string;
          create_time: number;
          reply_mode: string;
          keyword_list_info: Array<{
            type: string;
            match_mode: string;
            content: string;
          }>;
          reply_list_info: Array<{
            type: string;
            content?: string;
            news_info?: {
              list: Array<{
                title: string;
                author: string;
                digest: string;
                show_cover: number;
                cover_url: string;
                content_url: string;
                source_url: string;
              }>;
            };
          }>;
        }>;
      };
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    const rules = data.keyword_autoreply_info?.list.map(r => ({
      ruleName: r.rule_name,
      createTime: r.create_time,
      replyMode: r.reply_mode as "reply_all" | "random_one",
      keywordList: r.keyword_list_info.map(k => ({
        type: k.type as "text",
        matchMode: k.match_mode as "contain" | "equal",
        content: k.content,
      })),
      replyList: r.reply_list_info.map(reply => ({
        type: reply.type as "text" | "img" | "voice" | "video" | "news",
        content: reply.content,
        newsInfo: reply.news_info ? {
          list: reply.news_info.list.map(n => ({
            title: n.title,
            author: n.author,
            digest: n.digest,
            showCover: n.show_cover as 0 | 1,
            coverUrl: n.cover_url,
            contentUrl: n.content_url,
            sourceUrl: n.source_url,
          })),
        } : undefined,
      })),
    })) || [];

    return ok({
      isAddFriendReplyOpen: data.is_add_friend_reply_open === 1,
      isAutoReplyOpen: data.is_autoreply_open === 1,
      addFriendAutoReply: data.add_friend_autoreply_info,
      messageDefaultAutoReply: data.message_default_autoreply_info,
      keywordAutoReplyList: rules,
    });
  } catch (error) {
    return err(String(error));
  }
}
