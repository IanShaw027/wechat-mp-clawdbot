import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";

const ROOT = "/root/clawd/projects/wemp-v2/.data";

function ensureRoot(): void {
  mkdirSync(ROOT, { recursive: true });
}

export function readJsonFile<T>(name: string, fallback: T): T {
  ensureRoot();
  const file = path.join(ROOT, name);
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonFile<T>(name: string, value: T): void {
  ensureRoot();
  const file = path.join(ROOT, name);
  writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}
