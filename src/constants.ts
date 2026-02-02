/**
 * 微信公众号插件配置常量
 * 集中管理所有硬编码的配置值
 */

// ============ 时间相关常量 ============

/**
 * AI 助手关闭状态提示节流时间（毫秒）
 * 避免频繁提示用户开启 AI 助手
 */
export const AI_DISABLED_HINT_THROTTLE_MS = 2 * 60 * 1000; // 2 分钟

/**
 * 待处理图片超时时间（毫秒）
 * 用户发送图片后，等待用户说明的最长时间
 */
export const PENDING_IMAGE_TIMEOUT = 5 * 60 * 1000; // 5 分钟

/**
 * 配对码有效期（毫秒）
 * 用户生成配对码后，必须在此时间内完成配对
 */
export const PAIRING_CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 分钟

/**
 * Access Token 提前刷新时间（毫秒）
 * 在 token 过期前提前刷新，避免请求失败
 */
export const ACCESS_TOKEN_REFRESH_ADVANCE_MS = 5 * 60 * 1000; // 5 分钟

/**
 * 默认 Access Token 过期时间（秒）
 * 微信 API 返回的默认值
 */
export const DEFAULT_ACCESS_TOKEN_EXPIRY_SECONDS = 7200; // 2 小时

/**
 * Media ID 缓存有效期（毫秒）
 * 临时素材有效期为 3 天
 */
export const MEDIA_CACHE_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000; // 3 天

/**
 * Media ID 缓存提前过期时间（毫秒）
 * 提前 1 小时过期，避免使用过期的 media_id
 */
export const MEDIA_CACHE_ADVANCE_EXPIRY_MS = 60 * 60 * 1000; // 1 小时

/**
 * 消息去重超时时间（毫秒）
 * 防止重复处理同一条消息
 */
export const MESSAGE_DEDUP_TIMEOUT_MS = 30 * 1000; // 30 秒

/**
 * 默认 HTTP 请求超时时间（毫秒）
 */
export const DEFAULT_FETCH_TIMEOUT_MS = 10 * 1000; // 10 秒

/**
 * 素材下载超时时间（毫秒）
 * 用于下载临时素材和永久素材
 */
export const MEDIA_DOWNLOAD_TIMEOUT_MS = 30 * 1000; // 30 秒

/**
 * 永久素材上传超时时间（毫秒）
 * 永久素材上传可能较慢，给予更长的超时时间
 */
export const PERMANENT_MEDIA_UPLOAD_TIMEOUT_MS = 60 * 1000; // 60 秒

/**
 * 分段发送消息延迟时间（毫秒）
 * 避免发送过快导致消息顺序混乱
 */
export const MESSAGE_CHUNK_DELAY_MS = 300; // 300 毫秒

// ============ 大小限制常量 ============

/**
 * 图片最大字节数
 * 防止内存/带宽滥用
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Data URL 最大字节数
 * data URL 解码后的最大大小
 */
export const MAX_DATA_URL_BYTES = 3 * 1024 * 1024; // 3MB

/**
 * Webhook 请求体最大字节数
 * 防止恶意请求占用资源
 */
export const MAX_WEBHOOK_BODY_BYTES = 1 * 1024 * 1024; // 1MB

/**
 * 素材下载最大字节数
 * 用于下载临时素材和永久素材
 */
export const MAX_MEDIA_DOWNLOAD_BYTES = 20 * 1024 * 1024; // 20MB

// ============ 文本限制常量 ============

/**
 * 微信客服消息文本长度限制
 * 单条消息建议不超过此长度
 */
export const WECHAT_MESSAGE_TEXT_LIMIT = 600;

/**
 * 标点符号查找范围
 * 在分割长消息时，向前查找标点符号的最大距离
 */
export const PUNCTUATION_SEARCH_RANGE = 100;

// ============ 数量限制常量 ============

/**
 * 单次最多发送图片数量
 * 避免发送过多图片导致消息刷屏
 */
export const MAX_IMAGES_PER_MESSAGE = 10;
