/**
 * 微信公众号数据统计 API
 * 用于获取公众号运营数据
 */
import { extractList, type WechatListResponse, wechatApiPost } from "../api-utils.js";
import type { ResolvedWechatMpAccount } from "../types.js";
import { type Result, map } from "../result.js";

// ============ 用户数据 ============

/**
 * 用户增减数据项
 */
export interface UserSummaryItem {
  refDate: string;
  userSource: number;
  newUser: number;
  cancelUser: number;
}

/**
 * 累计用户数据项
 */
export interface UserCumulateItem {
  refDate: string;
  cumulateUser: number;
}

/**
 * 获取用户增减数据
 * 最大跨度 7 天
 */
export async function getUserSummary(
  account: ResolvedWechatMpAccount,
  beginDate: string,
  endDate: string
): Promise<Result<UserSummaryItem[]>> {
  type GetUserSummaryResponse = WechatListResponse<{
    ref_date: string;
    user_source: number;
    new_user: number;
    cancel_user: number;
  }>;

  const result = await wechatApiPost<GetUserSummaryResponse>(account, "/datacube/getusersummary", {
    begin_date: beginDate,
    end_date: endDate,
  });

  return map(result, (data) => extractList(data, (item) => ({
    refDate: item.ref_date,
    userSource: item.user_source,
    newUser: item.new_user,
    cancelUser: item.cancel_user,
  })));
}

/**
 * 获取累计用户数据
 * 最大跨度 7 天
 */
export async function getUserCumulate(
  account: ResolvedWechatMpAccount,
  beginDate: string,
  endDate: string
): Promise<Result<UserCumulateItem[]>> {
  type GetUserCumulateResponse = WechatListResponse<{ ref_date: string; cumulate_user: number }>;

  const result = await wechatApiPost<GetUserCumulateResponse>(account, "/datacube/getusercumulate", {
    begin_date: beginDate,
    end_date: endDate,
  });

  return map(result, (data) => extractList(data, (item) => ({
    refDate: item.ref_date,
    cumulateUser: item.cumulate_user,
  })));
}

// ============ 图文数据 ============

/**
 * 图文群发数据项
 */
export interface ArticleSummaryItem {
  refDate: string;
  msgId: string;
  title: string;
  intPageReadUser: number;
  intPageReadCount: number;
  oriPageReadUser: number;
  oriPageReadCount: number;
  shareUser: number;
  shareCount: number;
  addToFavUser: number;
  addToFavCount: number;
}

/**
 * 获取图文群发每日数据
 * 最大跨度 1 天
 */
export async function getArticleSummary(
  account: ResolvedWechatMpAccount,
  beginDate: string,
  endDate: string
): Promise<Result<ArticleSummaryItem[]>> {
  type GetArticleSummaryResponse = WechatListResponse<{
    ref_date: string;
    msgid: string;
    title: string;
    int_page_read_user: number;
    int_page_read_count: number;
    ori_page_read_user: number;
    ori_page_read_count: number;
    share_user: number;
    share_count: number;
    add_to_fav_user: number;
    add_to_fav_count: number;
  }>;

  const result = await wechatApiPost<GetArticleSummaryResponse>(account, "/datacube/getarticlesummary", {
    begin_date: beginDate,
    end_date: endDate,
  });

  return map(result, (data) => extractList(data, (item) => ({
    refDate: item.ref_date,
    msgId: item.msgid,
    title: item.title,
    intPageReadUser: item.int_page_read_user,
    intPageReadCount: item.int_page_read_count,
    oriPageReadUser: item.ori_page_read_user,
    oriPageReadCount: item.ori_page_read_count,
    shareUser: item.share_user,
    shareCount: item.share_count,
    addToFavUser: item.add_to_fav_user,
    addToFavCount: item.add_to_fav_count,
  })));
}

/**
 * 图文阅读概况数据项
 */
export interface UserReadItem {
  refDate: string;
  intPageReadUser: number;
  intPageReadCount: number;
  oriPageReadUser: number;
  oriPageReadCount: number;
  shareUser: number;
  shareCount: number;
  addToFavUser: number;
  addToFavCount: number;
}

/**
 * 获取图文阅读概况数据
 * 最大跨度 3 天
 */
export async function getUserRead(
  account: ResolvedWechatMpAccount,
  beginDate: string,
  endDate: string
): Promise<Result<UserReadItem[]>> {
  type GetUserReadResponse = WechatListResponse<{
    ref_date: string;
    int_page_read_user: number;
    int_page_read_count: number;
    ori_page_read_user: number;
    ori_page_read_count: number;
    share_user: number;
    share_count: number;
    add_to_fav_user: number;
    add_to_fav_count: number;
  }>;

  const result = await wechatApiPost<GetUserReadResponse>(account, "/datacube/getuserread", {
    begin_date: beginDate,
    end_date: endDate,
  });

  return map(result, (data) => extractList(data, (item) => ({
    refDate: item.ref_date,
    intPageReadUser: item.int_page_read_user,
    intPageReadCount: item.int_page_read_count,
    oriPageReadUser: item.ori_page_read_user,
    oriPageReadCount: item.ori_page_read_count,
    shareUser: item.share_user,
    shareCount: item.share_count,
    addToFavUser: item.add_to_fav_user,
    addToFavCount: item.add_to_fav_count,
  })));
}

/**
 * 图文转发数据项
 */
export interface UserShareItem {
  refDate: string;
  shareScene: number;
  shareCount: number;
  shareUser: number;
}

/**
 * 获取图文转发概况数据
 * 最大跨度 7 天
 */
export async function getUserShare(
  account: ResolvedWechatMpAccount,
  beginDate: string,
  endDate: string
): Promise<Result<UserShareItem[]>> {
  type GetUserShareResponse = WechatListResponse<{
    ref_date: string;
    share_scene: number;
    share_count: number;
    share_user: number;
  }>;

  const result = await wechatApiPost<GetUserShareResponse>(account, "/datacube/getusershare", {
    begin_date: beginDate,
    end_date: endDate,
  });

  return map(result, (data) => extractList(data, (item) => ({
    refDate: item.ref_date,
    shareScene: item.share_scene,
    shareCount: item.share_count,
    shareUser: item.share_user,
  })));
}

/**
 * 图文总数据详情
 */
export interface ArticleTotalDetail {
  statDate: string;
  targetUser: number;
  intPageReadUser: number;
  intPageReadCount: number;
  oriPageReadUser: number;
  oriPageReadCount: number;
  shareUser: number;
  shareCount: number;
  addToFavUser: number;
  addToFavCount: number;
  intPageFromSessionReadUser: number;
  intPageFromSessionReadCount: number;
  intPageFromHistMsgReadUser: number;
  intPageFromHistMsgReadCount: number;
  intPageFromFeedReadUser: number;
  intPageFromFeedReadCount: number;
  intPageFromFriendsReadUser: number;
  intPageFromFriendsReadCount: number;
  intPageFromOtherReadUser: number;
  intPageFromOtherReadCount: number;
  feedShareFromSessionUser: number;
  feedShareFromSessionCnt: number;
  feedShareFromFeedUser: number;
  feedShareFromFeedCnt: number;
  feedShareFromOtherUser: number;
  feedShareFromOtherCnt: number;
}

/**
 * 图文总数据项
 */
export interface ArticleTotalItem {
  refDate: string;
  msgId: string;
  title: string;
  details: ArticleTotalDetail[];
}

/**
 * 获取图文群发总数据
 * 最大跨度 1 天
 */
export async function getArticleTotal(
  account: ResolvedWechatMpAccount,
  beginDate: string,
  endDate: string
): Promise<Result<ArticleTotalItem[]>> {
  type GetArticleTotalResponse = WechatListResponse<{
    ref_date: string;
    msgid: string;
    title: string;
    details: Array<{
      stat_date: string;
      target_user: number;
      int_page_read_user: number;
      int_page_read_count: number;
      ori_page_read_user: number;
      ori_page_read_count: number;
      share_user: number;
      share_count: number;
      add_to_fav_user: number;
      add_to_fav_count: number;
      int_page_from_session_read_user: number;
      int_page_from_session_read_count: number;
      int_page_from_hist_msg_read_user: number;
      int_page_from_hist_msg_read_count: number;
      int_page_from_feed_read_user: number;
      int_page_from_feed_read_count: number;
      int_page_from_friends_read_user: number;
      int_page_from_friends_read_count: number;
      int_page_from_other_read_user: number;
      int_page_from_other_read_count: number;
      feed_share_from_session_user: number;
      feed_share_from_session_cnt: number;
      feed_share_from_feed_user: number;
      feed_share_from_feed_cnt: number;
      feed_share_from_other_user: number;
      feed_share_from_other_cnt: number;
    }>;
  }>;

  const result = await wechatApiPost<GetArticleTotalResponse>(account, "/datacube/getarticletotal", {
    begin_date: beginDate,
    end_date: endDate,
  });

  return map(result, (data) => extractList(data, (item) => ({
    refDate: item.ref_date,
    msgId: item.msgid,
    title: item.title,
    details: item.details.map((d) => ({
      statDate: d.stat_date,
      targetUser: d.target_user,
      intPageReadUser: d.int_page_read_user,
      intPageReadCount: d.int_page_read_count,
      oriPageReadUser: d.ori_page_read_user,
      oriPageReadCount: d.ori_page_read_count,
      shareUser: d.share_user,
      shareCount: d.share_count,
      addToFavUser: d.add_to_fav_user,
      addToFavCount: d.add_to_fav_count,
      intPageFromSessionReadUser: d.int_page_from_session_read_user,
      intPageFromSessionReadCount: d.int_page_from_session_read_count,
      intPageFromHistMsgReadUser: d.int_page_from_hist_msg_read_user,
      intPageFromHistMsgReadCount: d.int_page_from_hist_msg_read_count,
      intPageFromFeedReadUser: d.int_page_from_feed_read_user,
      intPageFromFeedReadCount: d.int_page_from_feed_read_count,
      intPageFromFriendsReadUser: d.int_page_from_friends_read_user,
      intPageFromFriendsReadCount: d.int_page_from_friends_read_count,
      intPageFromOtherReadUser: d.int_page_from_other_read_user,
      intPageFromOtherReadCount: d.int_page_from_other_read_count,
      feedShareFromSessionUser: d.feed_share_from_session_user,
      feedShareFromSessionCnt: d.feed_share_from_session_cnt,
      feedShareFromFeedUser: d.feed_share_from_feed_user,
      feedShareFromFeedCnt: d.feed_share_from_feed_cnt,
      feedShareFromOtherUser: d.feed_share_from_other_user,
      feedShareFromOtherCnt: d.feed_share_from_other_cnt,
    })),
  })));
}

// ============ 消息数据 ============

/**
 * 消息发送数据项
 */
export interface UpstreamMsgItem {
  refDate: string;
  msgType: number;
  msgUser: number;
  msgCount: number;
}

/**
 * 获取消息发送概况数据
 * 最大跨度 7 天
 */
export async function getUpstreamMsg(
  account: ResolvedWechatMpAccount,
  beginDate: string,
  endDate: string
): Promise<Result<UpstreamMsgItem[]>> {
  type GetUpstreamMsgResponse = WechatListResponse<{
    ref_date: string;
    msg_type: number;
    msg_user: number;
    msg_count: number;
  }>;

  const result = await wechatApiPost<GetUpstreamMsgResponse>(account, "/datacube/getupstreammsg", {
    begin_date: beginDate,
    end_date: endDate,
  });

  return map(result, (data) => extractList(data, (item) => ({
    refDate: item.ref_date,
    msgType: item.msg_type,
    msgUser: item.msg_user,
    msgCount: item.msg_count,
  })));
}

/**
 * 消息分时数据项
 */
export interface UpstreamMsgHourItem {
  refDate: string;
  refHour: number;
  msgType: number;
  msgUser: number;
  msgCount: number;
}

/**
 * 获取消息发送分时数据
 * 最大跨度 1 天
 */
export async function getUpstreamMsgHour(
  account: ResolvedWechatMpAccount,
  beginDate: string,
  endDate: string
): Promise<Result<UpstreamMsgHourItem[]>> {
  type GetUpstreamMsgHourResponse = WechatListResponse<{
    ref_date: string;
    ref_hour: number;
    msg_type: number;
    msg_user: number;
    msg_count: number;
  }>;

  const result = await wechatApiPost<GetUpstreamMsgHourResponse>(account, "/datacube/getupstreammsghour", {
    begin_date: beginDate,
    end_date: endDate,
  });

  return map(result, (data) => extractList(data, (item) => ({
    refDate: item.ref_date,
    refHour: item.ref_hour,
    msgType: item.msg_type,
    msgUser: item.msg_user,
    msgCount: item.msg_count,
  })));
}

// ============ 辅助函数 ============

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 获取昨天的日期
 */
export function getYesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return formatDate(date);
}

/**
 * 获取 N 天前的日期
 */
export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDate(date);
}

/**
 * 获取上周的日期范围
 */
export function getLastWeekRange(): { beginDate: string; endDate: string } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  // 周日时 dayOfWeek 为 0，需要当作 7 处理
  const offset = dayOfWeek || 7;
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - offset);
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);

  return {
    beginDate: formatDate(lastMonday),
    endDate: formatDate(lastSunday),
  };
}
