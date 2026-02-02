/**
 * 微信公众号用户管理 API
 * 用于获取和管理用户信息
 */
import { wechatApiGet, wechatApiPost, type WechatApiResponse } from "../api-utils.js";
import type { ResolvedWechatMpAccount } from "../types.js";
import { type Result, err, map } from "../result.js";

/**
 * 用户信息
 */
export interface UserInfo {
  openId: string;
  unionId?: string;
  nickname: string;
  sex: 0 | 1 | 2;
  city: string;
  province: string;
  country: string;
  headImgUrl: string;
  subscribeTime: number;
  subscribe: number;
  remark: string;
  groupId: number;
  tagIds: number[];
  subscribeScene: string;
  qrScene: number;
  qrSceneStr: string;
}

/**
 * 获取用户基本信息
 */
export async function getUserInfo(
  account: ResolvedWechatMpAccount,
  openId: string,
  lang: "zh_CN" | "zh_TW" | "en" = "zh_CN"
): Promise<Result<UserInfo>> {
  type GetUserInfoResponse = WechatApiResponse & {
    subscribe?: number;
    openid?: string;
    unionid?: string;
    nickname?: string;
    sex?: number;
    city?: string;
    province?: string;
    country?: string;
    headimgurl?: string;
    subscribe_time?: number;
    remark?: string;
    groupid?: number;
    tagid_list?: number[];
    subscribe_scene?: string;
    qr_scene?: number;
    qr_scene_str?: string;
  };

  const result = await wechatApiGet<GetUserInfoResponse>(account, "/cgi-bin/user/info", {
    query: { openid: openId, lang },
  });

  return map(result, (data) => ({
    openId: data.openid || openId,
    unionId: data.unionid,
    nickname: data.nickname || "",
    sex: (data.sex || 0) as 0 | 1 | 2,
    city: data.city || "",
    province: data.province || "",
    country: data.country || "",
    headImgUrl: data.headimgurl || "",
    subscribeTime: data.subscribe_time || 0,
    subscribe: data.subscribe || 0,
    remark: data.remark || "",
    groupId: data.groupid || 0,
    tagIds: data.tagid_list || [],
    subscribeScene: data.subscribe_scene || "",
    qrScene: data.qr_scene || 0,
    qrSceneStr: data.qr_scene_str || "",
  }));
}

/**
 * 批量获取用户信息
 * 每次最多 100 个
 */
export async function batchGetUserInfo(
  account: ResolvedWechatMpAccount,
  openIds: string[],
  lang: "zh_CN" | "zh_TW" | "en" = "zh_CN"
): Promise<Result<UserInfo[]>> {
  if (openIds.length > 100) {
    return err("每次最多获取 100 个用户信息");
  }

  type BatchGetUserInfoResponse = WechatApiResponse & {
    user_info_list?: Array<{
      subscribe: number;
      openid: string;
      unionid?: string;
      nickname: string;
      sex: number;
      city: string;
      province: string;
      country: string;
      headimgurl: string;
      subscribe_time: number;
      remark: string;
      groupid: number;
      tagid_list: number[];
      subscribe_scene: string;
      qr_scene: number;
      qr_scene_str: string;
    }>;
  };

  const result = await wechatApiPost<BatchGetUserInfoResponse>(account, "/cgi-bin/user/info/batchget", {
    user_list: openIds.map((openid) => ({ openid, lang })),
  });

  return map(result, (data) => (
    data.user_info_list?.map((u) => ({
      openId: u.openid,
      unionId: u.unionid,
      nickname: u.nickname || "",
      sex: (u.sex || 0) as 0 | 1 | 2,
      city: u.city || "",
      province: u.province || "",
      country: u.country || "",
      headImgUrl: u.headimgurl || "",
      subscribeTime: u.subscribe_time || 0,
      subscribe: u.subscribe || 0,
      remark: u.remark || "",
      groupId: u.groupid || 0,
      tagIds: u.tagid_list || [],
      subscribeScene: u.subscribe_scene || "",
      qrScene: u.qr_scene || 0,
      qrSceneStr: u.qr_scene_str || "",
    })) || []
  ));
}

/**
 * 获取关注者列表
 */
export async function getFollowers(
  account: ResolvedWechatMpAccount,
  nextOpenId?: string
): Promise<Result<{ total: number; count: number; openIds: string[]; nextOpenId?: string }>> {
  type GetFollowersResponse = WechatApiResponse & {
    total?: number;
    count?: number;
    data?: { openid: string[] };
    next_openid?: string;
  };

  const result = await wechatApiGet<GetFollowersResponse>(account, "/cgi-bin/user/get", {
    query: { next_openid: nextOpenId },
  });

  return map(result, (data) => ({
    total: data.total || 0,
    count: data.count || 0,
    openIds: data.data?.openid || [],
    nextOpenId: data.next_openid,
  }));
}

/**
 * 设置用户备注名
 */
export async function setUserRemark(
  account: ResolvedWechatMpAccount,
  openId: string,
  remark: string
): Promise<Result<void>> {
  const result = await wechatApiPost<WechatApiResponse>(account, "/cgi-bin/user/info/updateremark", {
    openid: openId,
    remark,
  });

  return map(result, () => undefined);
}

// ============ 黑名单管理 ============

/**
 * 获取黑名单列表
 */
export async function getBlacklist(
  account: ResolvedWechatMpAccount,
  beginOpenId?: string
): Promise<Result<{ total: number; count: number; openIds: string[]; nextOpenId?: string }>> {
  type GetBlacklistResponse = WechatApiResponse & {
    total?: number;
    count?: number;
    data?: { openid: string[] };
    next_openid?: string;
  };

  const result = await wechatApiPost<GetBlacklistResponse>(account, "/cgi-bin/tags/members/getblacklist", {
    begin_openid: beginOpenId || "",
  });

  return map(result, (data) => ({
    total: data.total || 0,
    count: data.count || 0,
    openIds: data.data?.openid || [],
    nextOpenId: data.next_openid,
  }));
}

/**
 * 拉黑用户
 */
export async function batchBlacklistUsers(
  account: ResolvedWechatMpAccount,
  openIds: string[]
): Promise<Result<void>> {
  if (openIds.length > 20) {
    return err("每次最多拉黑 20 个用户");
  }

  const result = await wechatApiPost<WechatApiResponse>(account, "/cgi-bin/tags/members/batchblacklist", {
    openid_list: openIds,
  });

  return map(result, () => undefined);
}

/**
 * 取消拉黑
 */
export async function batchUnblacklistUsers(
  account: ResolvedWechatMpAccount,
  openIds: string[]
): Promise<Result<void>> {
  if (openIds.length > 20) {
    return err("每次最多取消拉黑 20 个用户");
  }

  const result = await wechatApiPost<WechatApiResponse>(account, "/cgi-bin/tags/members/batchunblacklist", {
    openid_list: openIds,
  });

  return map(result, () => undefined);
}
