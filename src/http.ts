import type { IncomingMessage } from "node:http";

/**
 * 读取请求体，带超时和大小限制
 * 安全加固：防止慢速 body DoS 攻击
 */
export async function readRequestBody(
  req: IncomingMessage,
  maxBytes: number,
  timeoutMs: number = 5000
): Promise<string> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let timeoutHandle: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
    };

    // 设置超时
    timeoutHandle = setTimeout(() => {
      cleanup();
      reject(new Error(`Request body read timeout (limit=${timeoutMs}ms)`));
      try {
        req.destroy();
      } catch {
        // ignore
      }
    }, timeoutMs);

    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        cleanup();
        reject(new Error(`Request body too large (limit=${maxBytes})`));
        try {
          req.destroy();
        } catch {
          // ignore
        }
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      cleanup();
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", (err) => {
      cleanup();
      reject(err);
    });
  });
}

