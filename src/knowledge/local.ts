import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";
import type { KnowledgeProvider, KnowledgeProviderConfig, KnowledgeSearchResult } from "./types.js";

const MAX_SCAN_FILES = 200;
const MAX_FILE_SIZE_BYTES = 256 * 1024;
const DEFAULT_LOCAL_DIRS = ["knowledge", path.join("wemp-kf", "knowledge")];

function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

function extractTerms(query: string): string[] {
  const normalized = normalizeText(query);
  const terms = normalized.match(/[a-z0-9_]+|[\u4e00-\u9fa5]{1,}/g) || [];
  return Array.from(new Set(terms.filter((item) => item.length > 0)));
}

function collectMarkdownFiles(root: string, out: string[]): void {
  if (out.length >= MAX_SCAN_FILES) return;
  let entries: string[] = [];
  try {
    entries = readdirSync(root);
  } catch {
    return;
  }
  for (const name of entries) {
    if (out.length >= MAX_SCAN_FILES) return;
    const full = path.join(root, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      collectMarkdownFiles(full, out);
      continue;
    }
    if (!st.isFile() || st.size > MAX_FILE_SIZE_BYTES) continue;
    if (!full.toLowerCase().endsWith(".md")) continue;
    out.push(full);
  }
}

function resolveRoots(config: KnowledgeProviderConfig): string[] {
  const cwd = process.cwd();
  const fromConfig: string[] = [];
  const custom = config.path || config.rootDir || config.directory;
  if (typeof custom === "string" && custom.trim()) {
    fromConfig.push(custom.trim());
  }
  const roots = (fromConfig.length ? fromConfig : DEFAULT_LOCAL_DIRS).map((item) => (path.isAbsolute(item) ? item : path.join(cwd, item)));
  return Array.from(new Set(roots)).filter((item) => existsSync(item));
}

function extractTitle(content: string, filePath: string): string {
  const firstHeading = /^\s*#\s+(.+)$/m.exec(content)?.[1]?.trim();
  return firstHeading || path.basename(filePath, ".md");
}

function scoreContent(content: string, terms: string[]): number {
  if (!terms.length) return 0;
  const haystack = normalizeText(content);
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = haystack.match(new RegExp(escaped, "g"))?.length || 0;
    score += matches;
  }
  return score;
}

export const localKnowledgeProvider: KnowledgeProvider = {
  type: "local",
  async healthCheck(config: KnowledgeProviderConfig) {
    const roots = resolveRoots(config);
    if (!roots.length) return { ok: false, message: "local knowledge root not found" };
    return { ok: true };
  },
  async search(query: string, config: KnowledgeProviderConfig): Promise<KnowledgeSearchResult[]> {
    const roots = resolveRoots(config);
    if (!roots.length) return [];
    const files: string[] = [];
    for (const root of roots) {
      collectMarkdownFiles(root, files);
      if (files.length >= MAX_SCAN_FILES) break;
    }
    const terms = extractTerms(query);
    const ranked: Array<{ file: string; title: string; content: string; score: number }> = [];
    for (const file of files) {
      let content = "";
      try {
        content = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const score = scoreContent(content, terms);
      if (score <= 0) continue;
      ranked.push({
        file,
        title: extractTitle(content, file),
        content: content.slice(0, 1200),
        score,
      });
    }
    ranked.sort((a, b) => b.score - a.score);
    return ranked.slice(0, 5).map((item) => ({
      title: item.title,
      content: item.content,
      source: `local:${path.relative(process.cwd(), item.file) || item.file}`,
      score: item.score,
    }));
  },
};
