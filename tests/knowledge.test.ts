import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { searchKnowledge } from "../src/knowledge/index.js";
import { milvusKnowledgeProvider } from "../src/knowledge/milvus.js";
import type { KnowledgeProviderConfig } from "../src/knowledge/types.js";

test("searchKnowledge external mode falls back to local when external only returns errors", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "wemp-knowledge-"));
  const knowledgeDir = path.join(root, "knowledge");
  mkdirSync(knowledgeDir, { recursive: true });
  writeFileSync(path.join(knowledgeDir, "faq.md"), "# FAQ\n\nhello world question and answer", "utf8");

  const configs: KnowledgeProviderConfig[] = [
    { type: "local", enabled: true, path: knowledgeDir, name: "local-test" },
    { type: "dify", enabled: true, baseUrl: "", apiKey: "", name: "dify-test" },
  ];

  const results = await searchKnowledge("hello world", "external", configs);
  assert.ok(results.length > 0);
  assert.ok(results.some((item) => String(item.source || "").startsWith("local:")));
});

test("milvus search filters by minScore and empty content, sorts by score desc, and applies topK", async (t) => {
  const originalFetch = globalThis.fetch;
  let requestBody: any;

  globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
    requestBody = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({
      data: [
        { title: "low", text: "low text", source: "milvus", score: 0.62 },
        { title: "empty", text: "   ", source: "milvus", score: 0.99 },
        { title: "mid", text: "mid text", source: "milvus", score: 0.8 },
        { title: "high", text: "high text", source: "milvus", score: 0.95 },
      ],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const results = await milvusKnowledgeProvider.search("query", {
    type: "milvus",
    endpoint: "https://milvus.example.com",
    collection: "docs",
    minScore: 0.7,
    topK: 2,
  });

  assert.equal(requestBody.limit, 2);
  assert.deepEqual(
    results.map((item) => item.title),
    ["high", "mid"],
  );
  assert.deepEqual(
    results.map((item) => item.score),
    [0.95, 0.8],
  );
});

test("milvus search keeps scored items ahead of unscored items", async (t) => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => new Response(JSON.stringify({
    data: [
      { title: "no-score-a", text: "A" },
      { title: "scored-low", text: "B", score: 0.15 },
      { title: "scored-high", text: "C", score: 0.91 },
      { title: "no-score-b", text: "D" },
    ],
  }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const results = await milvusKnowledgeProvider.search("query", {
    type: "milvus",
    endpoint: "https://milvus.example.com",
    collection: "docs",
    topK: 4,
  });

  assert.deepEqual(
    results.map((item) => item.title),
    ["scored-high", "scored-low", "no-score-a", "no-score-b"],
  );
});

test("searchKnowledge caches repeated queries within ttl", async (t) => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  const seed = `${Date.now()}-${Math.random()}`;
  const query = `cache-query-${seed}`;

  globalThis.fetch = (async () => {
    fetchCount += 1;
    return new Response(JSON.stringify({
      data: [{ title: "cached", text: "cached-result", score: 0.9, source: "milvus" }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const configs: KnowledgeProviderConfig[] = [
    { type: "milvus", enabled: true, endpoint: "https://milvus.example.com", collection: "docs", topK: 3 },
  ];

  const first = await searchKnowledge(query, "external", configs);
  const second = await searchKnowledge(query, "external", configs);

  assert.equal(fetchCount, 1);
  assert.deepEqual(second, first);
});
