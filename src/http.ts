import type { IncomingMessage, ServerResponse } from "node:http";

export async function readRequestBody(req: IncomingMessage): Promise<string> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function getPathname(url: string | undefined): string {
  return new URL(url || "/", "http://localhost").pathname || "/";
}

export function getSearchParams(url: string | undefined): URLSearchParams {
  return new URL(url || "/", "http://localhost").searchParams;
}

export function sendText(res: ServerResponse, statusCode: number, body: string, contentType = "text/plain; charset=utf-8"): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", contentType);
  res.end(body);
}

export function xmlEscape(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildPassiveTextReply(toUser: string, fromUser: string, content: string, createTime = Math.floor(Date.now() / 1000)): string {
  return `<xml>\n<ToUserName><![CDATA[${toUser}]]></ToUserName>\n<FromUserName><![CDATA[${fromUser}]]></FromUserName>\n<CreateTime>${createTime}</CreateTime>\n<MsgType><![CDATA[text]]></MsgType>\n<Content><![CDATA[${content}]]></Content>\n</xml>`;
}
