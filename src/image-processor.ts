/**
 * 图片处理模块
 * 负责从文本中提取、处理图片 URL（包括 HTTP URL 和 data URL）
 */

// 匹配文本中的图片 URL（支持 markdown 格式和纯 URL）
const IMAGE_URL_PATTERNS = [
  /!\[.*?\]\((https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s)]*)?)\)/gi, // ![alt](http url)
  /(?<!\()(https?:\/\/[^\s<>"']+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s<>"']*)?)(?!\))/gi, // 纯 http URL
];

// 匹配 data URL 格式的图片
const DATA_URL_PATTERNS = [
  /!\[.*?\]\((data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)\)/gi, // ![alt](data:image/...;base64,...)
  /(?<!\()(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)(?!\))/gi, // 纯 data URL
];

// 已知的图片服务域名（这些服务的 URL 可能没有扩展名）
const KNOWN_IMAGE_HOSTS = [
  "picsum.photos",
  "unsplash.com",
  "images.unsplash.com",
  "source.unsplash.com",
  "placekitten.com",
  "placehold.co",
  "placeholder.com",
];

/**
 * 从文本中提取图片 URL（包括 http URL 和 data URL）
 */
export function extractImageUrls(text: string): { httpUrls: string[]; dataUrls: string[] } {
  const httpUrls = new Set<string>();
  const dataUrls = new Set<string>();

  // 1. 匹配 data URL 格式的图片
  for (const pattern of DATA_URL_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const url = match[1] || match[0];
      if (url) dataUrls.add(url);
    }
  }

  // 2. 匹配带扩展名的 HTTP 图片 URL
  for (const pattern of IMAGE_URL_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const url = match[1] || match[0];
      if (url) httpUrls.add(url);
    }
  }

  // 3. 匹配已知图片服务的 URL（可能没有扩展名）
  const urlPattern = /https?:\/\/[^\s<>"')\]]+/gi;
  const allUrls = text.matchAll(urlPattern);
  for (const match of allUrls) {
    const url = match[0];
    try {
      const hostname = new URL(url).hostname;
      if (KNOWN_IMAGE_HOSTS.some(host => hostname === host || hostname.endsWith(`.${host}`))) {
        httpUrls.add(url);
      }
    } catch {
      // 无效 URL，忽略
    }
  }

  return { httpUrls: Array.from(httpUrls), dataUrls: Array.from(dataUrls) };
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 处理文本中的图片，提取并移除图片 URL
 * 返回处理后的文本和图片 URL 列表（data URL 和 http URL 合并）
 */
export function processImagesInText(text: string): { text: string; imageUrls: string[] } {
  let processedText = text;
  const { httpUrls, dataUrls } = extractImageUrls(text);
  const allImageUrls = [...dataUrls, ...httpUrls]; // data URL 优先

  // 从文本中移除已提取的图片 URL（包括 markdown 格式）
  for (const url of allImageUrls) {
    // 对于 data URL，需要特殊处理（因为太长，用简化的正则）
    if (url.startsWith("data:")) {
      // 移除 markdown 格式的 data URL
      processedText = processedText.replace(/!\[.*?\]\(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+\)/gi, "");
    } else {
      processedText = processedText
        .replace(new RegExp(`!\\[.*?\\]\\(${escapeRegExp(url)}\\)`, "g"), "")
        .replace(new RegExp(escapeRegExp(url), "g"), "");
    }
  }

  // 清理多余的空行
  processedText = processedText.replace(/\n{3,}/g, "\n\n").trim();

  return { text: processedText, imageUrls: allImageUrls };
}
