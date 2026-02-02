/**
 * 微信公众号消息发送
 */
import type { ResolvedWechatMpAccount } from "./types.js";
import { sendCustomMessage } from "./api.js";
import { isOk } from "./result.js";
import {
  WECHAT_MESSAGE_TEXT_LIMIT,
  MESSAGE_CHUNK_DELAY_MS,
  PUNCTUATION_SEARCH_RANGE,
} from "./constants.js";

/**
 * 发送文本消息
 */
export async function sendText(opts: {
  to: string;
  text: string;
  accountId?: string;
  replyToId?: string;
  account: ResolvedWechatMpAccount;
}): Promise<{ messageId?: string; error?: string }> {
  const { to, text, account } = opts;

  // 微信客服消息单条建议不超过限制，超过则分段发送
  const parts = splitMessage(text, WECHAT_MESSAGE_TEXT_LIMIT);

  for (let i = 0; i < parts.length; i++) {
    const result = await sendCustomMessage(account, to, parts[i]);
    if (!isOk(result)) {
      return { error: result.error };
    }
    // 分段发送时稍微延迟
    if (i < parts.length - 1) {
      await new Promise((r) => setTimeout(r, MESSAGE_CHUNK_DELAY_MS));
    }
  }

  return { messageId: `wemp-${Date.now()}` };
}

/**
 * 分割长消息
 */
function splitMessage(text: string, maxLength: number): string[] {
  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      parts.push(remaining);
      break;
    }

    // 尝试在标点符号处断开
    let splitIndex = maxLength;
    const punctuation = ["。", "！", "？", "\n", "；", "，"];

    for (let i = maxLength; i > maxLength - PUNCTUATION_SEARCH_RANGE && i > 0; i--) {
      if (punctuation.includes(remaining[i])) {
        splitIndex = i + 1;
        break;
      }
    }

    parts.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex);
  }

  return parts;
}
