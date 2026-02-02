/**
 * 微信公众号配对功能
 * 支持通过其他渠道配对，配对后可使用完整的个人助理功能
 */
import * as path from "node:path";
import * as crypto from "node:crypto";
import { PAIRING_CODE_EXPIRY_MS } from "./constants.js";
import { getDataDir, readJsonFile, writeJsonFile } from "./storage.js";

// 数据存储路径
const DATA_DIR = getDataDir();
const PAIRING_FILE = path.join(DATA_DIR, "paired-users.json");
const PENDING_FILE = path.join(DATA_DIR, "pending-codes.json");

// 配对用户信息
export interface PairedUser {
  pairedAt: number;
  pairedBy: string;
  pairedByName?: string;
  pairedByChannel?: string;
}

// 待验证的配对码
interface PendingCode {
  openId: string;
  accountId: string;
  createdAt: number;
}

/**
 * 加载配对用户列表
 */
function loadPairedUsers(): Record<string, PairedUser> {
  return readJsonFile(PAIRING_FILE, {});
}

/**
 * 保存配对用户列表
 */
function savePairedUsers(users: Record<string, PairedUser>): void {
  writeJsonFile(PAIRING_FILE, users);
}

/**
 * 加载待验证的配对码
 */
function loadPendingCodes(): Record<string, PendingCode> {
  const data = readJsonFile<Record<string, PendingCode>>(PENDING_FILE, {});
  // 清理过期的配对码
  const now = Date.now();
  const valid: Record<string, PendingCode> = {};
  for (const [code, info] of Object.entries(data)) {
    if (now - info.createdAt < PAIRING_CODE_EXPIRY_MS) {
      valid[code] = info;
    }
  }
  return valid;
}

/**
 * 保存待验证的配对码
 */
function savePendingCodes(codes: Record<string, PendingCode>): void {
  writeJsonFile(PENDING_FILE, codes);
}

/**
 * 生成用户唯一标识（accountId:openId）
 */
function getUserKey(accountId: string, openId: string): string {
  return `${accountId}:${openId}`;
}

/**
 * 检查用户是否已配对
 */
export function isPaired(accountId: string, openId: string): boolean {
  const users = loadPairedUsers();
  return !!users[getUserKey(accountId, openId)];
}

/**
 * 获取已配对用户信息
 */
export function getPairedUser(accountId: string, openId: string): PairedUser | null {
  const users = loadPairedUsers();
  return users[getUserKey(accountId, openId)] || null;
}

/**
 * 生成配对码
 */
export function generatePairingCode(accountId: string, openId: string): string {
  const codes = loadPendingCodes();
  const userKey = getUserKey(accountId, openId);

  // 检查是否已有未过期的配对码
  for (const [code, info] of Object.entries(codes)) {
    if (info.accountId === accountId && info.openId === openId) {
      return code;
    }
  }

  // 生成新的 6 位配对码
  const code = crypto.randomInt(100000, 999999).toString();
  codes[code] = {
    openId,
    accountId,
    createdAt: Date.now(),
  };
  savePendingCodes(codes);

  return code;
}

/**
 * 验证配对码（从其他渠道调用）
 * 返回 { accountId, openId } 如果验证成功，否则返回 null
 */
export function verifyPairingCode(
  code: string,
  userId: string,
  userName?: string,
  channel?: string
): { accountId: string; openId: string } | null {
  const codes = loadPendingCodes();
  const info = codes[code];

  if (!info) {
    return null;
  }

  // 检查是否过期
  if (Date.now() - info.createdAt > PAIRING_CODE_EXPIRY_MS) {
    delete codes[code];
    savePendingCodes(codes);
    return null;
  }

  // 配对成功
  const users = loadPairedUsers();
  const userKey = getUserKey(info.accountId, info.openId);
  users[userKey] = {
    pairedAt: Date.now(),
    pairedBy: userId,
    pairedByName: userName,
    pairedByChannel: channel,
  };
  savePairedUsers(users);

  // 删除已使用的配对码
  delete codes[code];
  savePendingCodes(codes);

  return { accountId: info.accountId, openId: info.openId };
}

/**
 * 取消配对
 */
export function unpair(accountId: string, openId: string): boolean {
  const users = loadPairedUsers();
  const userKey = getUserKey(accountId, openId);
  if (users[userKey]) {
    delete users[userKey];
    savePairedUsers(users);
    return true;
  }
  return false;
}

/**
 * 列出所有已配对用户
 */
export function listPairedUsers(): Record<string, PairedUser> {
  return loadPairedUsers();
}

// 配对 API Token（强安全：默认禁用，必须显式配置）
// - 可通过环境变量 WEMP_PAIRING_API_TOKEN 设置（作为全局默认）
// - 也可通过配置文件按 accountId 覆盖（见 setPairingApiToken）
const pairingApiTokenByAccountId = new Map<string, string>();
let defaultPairingApiToken: string | undefined = process.env.WEMP_PAIRING_API_TOKEN?.trim() || undefined;

/**
 * 设置配对 API Token
 */
export function setPairingApiToken(accountId: string, token: string): void {
  const t = String(token || "").trim();
  if (!t) return;
  pairingApiTokenByAccountId.set(accountId, t);
}

/**
 * 获取配对 API Token（用于验证其他渠道的配对请求）
 */
export function getPairingApiToken(accountId: string): string | undefined {
  return pairingApiTokenByAccountId.get(accountId) ?? defaultPairingApiToken;
}
