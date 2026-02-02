/**
 * 菜单点击 payload 存储
 *
 * 背景：
 * - 微信自定义菜单 click 的 key 最长 128 字节
 * - get_current_selfmenu_info 的后台菜单里，value/url/title 可能很长且包含 `_`
 * - 直接把这些内容拼进 key 会导致创建菜单失败或解析错误
 *
 * 方案：
 * - 将长 payload 存到本地 JSON 文件
 * - key 只携带短 id（哈希），保证长度稳定
 */
import * as crypto from "node:crypto";
import * as path from "node:path";
import { getDataDir, JsonStore } from "./storage.js";

const DATA_DIR = getDataDir();
const MENU_PAYLOAD_FILE = path.join(DATA_DIR, "menu-payloads.json");

export type MenuPayload =
  | { kind: "text"; text: string }
  | { kind: "news"; title: string; contentUrl: string }
  | { kind: "image"; mediaId: string }
  | { kind: "voice"; mediaId: string }
  | { kind: "video"; value: string }
  | { kind: "finder"; value: string }
  | { kind: "unknown"; originalType?: string; key?: string; value?: string; url?: string };

type StoredPayload = {
  payload: MenuPayload;
  updatedAt: number;
};

type StoreFile = {
  version: 1;
  // accountId -> id -> payload
  accounts: Record<string, Record<string, StoredPayload>>;
};

// 使用 JsonStore 管理存储
const store = new JsonStore<StoreFile>(MENU_PAYLOAD_FILE, { version: 1, accounts: {} });

/**
 * 生成稳定的短 id（16 hex chars = 8 bytes）
 * - 仅使用安全字符，避免微信 key 编码/解析问题
 */
export function makeMenuPayloadId(accountId: string, payload: MenuPayload): string {
  const h = crypto.createHash("sha256");
  h.update(accountId);
  h.update("\n");
  h.update(JSON.stringify(payload));
  return h.digest("hex").slice(0, 16);
}

export function upsertMenuPayload(accountId: string, id: string, payload: MenuPayload): void {
  store.update((data) => {
    if (!data.accounts[accountId]) {
      data.accounts[accountId] = {};
    }
    data.accounts[accountId][id] = { payload, updatedAt: Date.now() };
    return data;
  });
}

export function getMenuPayload(accountId: string, id: string): MenuPayload | null {
  const data = store.read();
  const entry = data.accounts[accountId]?.[id];
  return entry?.payload ?? null;
}
