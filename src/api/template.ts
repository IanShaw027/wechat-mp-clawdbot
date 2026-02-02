/**
 * 微信公众号模板消息 API
 * 用于发送模板消息
 */
import { getAccessToken, safeFetch } from "../api.js";
import { DEFAULT_FETCH_TIMEOUT_MS } from "../constants.js";
import type { ResolvedWechatMpAccount } from "../types.js";
import { type Result, ok, err } from "../result.js";

const API_BASE = "https://api.weixin.qq.com";

/**
 * 模板消息数据
 */
export interface TemplateData {
  [key: string]: {
    value: string;
    color?: string;
  };
}

/**
 * 模板信息
 */
export interface Template {
  templateId: string;
  title: string;
  primaryIndustry: string;
  deputyIndustry: string;
  content: string;
  example: string;
}

/**
 * 发送模板消息
 */
export async function sendTemplateMessage(
  account: ResolvedWechatMpAccount,
  openId: string,
  templateId: string,
  data: TemplateData,
  options?: {
    url?: string;
    miniprogram?: {
      appid: string;
      pagepath: string;
    };
    clientMsgId?: string;
  }
): Promise<Result<number>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/message/template/send?access_token=${accessToken}`;

    const body: Record<string, unknown> = {
      touser: openId,
      template_id: templateId,
      data,
    };

    if (options?.url) {
      body.url = options.url;
    }
    if (options?.miniprogram) {
      body.miniprogram = options.miniprogram;
    }
    if (options?.clientMsgId) {
      body.client_msg_id = options.clientMsgId;
    }

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const result = await response.json() as {
      msgid?: number;
      errcode?: number;
      errmsg?: string;
    };

    if (result.errcode && result.errcode !== 0) {
      return err(`${result.errcode} - ${result.errmsg}`);
    }

    return ok(result.msgid || 0);
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 获取模板列表
 */
export async function getTemplates(
  account: ResolvedWechatMpAccount
): Promise<Result<Template[]>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/template/get_all_private_template?access_token=${accessToken}`;

    const response = await safeFetch(url, undefined, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });
    const data = await response.json() as {
      template_list?: Array<{
        template_id: string;
        title: string;
        primary_industry: string;
        deputy_industry: string;
        content: string;
        example: string;
      }>;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    const templates = data.template_list?.map(t => ({
      templateId: t.template_id,
      title: t.title,
      primaryIndustry: t.primary_industry,
      deputyIndustry: t.deputy_industry,
      content: t.content,
      example: t.example,
    })) || [];

    return ok(templates);
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 添加模板
 */
export async function addTemplate(
  account: ResolvedWechatMpAccount,
  templateIdShort: string,
  keywordIds?: number[]
): Promise<Result<string>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/template/api_add_template?access_token=${accessToken}`;

    const body: Record<string, unknown> = {
      template_id_short: templateIdShort,
    };
    if (keywordIds && keywordIds.length > 0) {
      body.keyword_id_list = keywordIds;
    }

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });

    const data = await response.json() as {
      template_id?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    if (!data.template_id) {
      return err("添加模板成功但未返回模板 ID");
    }

    return ok(data.template_id);
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 删除模板
 */
export async function deleteTemplate(
  account: ResolvedWechatMpAccount,
  templateId: string
): Promise<Result<void>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/template/del_private_template?access_token=${accessToken}`;

    const response = await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: templateId }),
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
 * 获取行业信息
 */
export async function getIndustry(
  account: ResolvedWechatMpAccount
): Promise<Result<{ primaryIndustry: { firstClass: string; secondClass: string }; secondaryIndustry: { firstClass: string; secondClass: string } }>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cgi-bin/template/get_industry?access_token=${accessToken}`;

    const response = await safeFetch(url, undefined, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });
    const data = await response.json() as {
      primary_industry?: { first_class: string; second_class: string };
      secondary_industry?: { first_class: string; second_class: string };
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok({
      primaryIndustry: {
        firstClass: data.primary_industry?.first_class || "",
        secondClass: data.primary_industry?.second_class || "",
      },
      secondaryIndustry: {
        firstClass: data.secondary_industry?.first_class || "",
        secondClass: data.secondary_industry?.second_class || "",
      },
    });
  } catch (error) {
    return err(String(error));
  }
}
