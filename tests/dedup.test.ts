import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import test from "node:test";

const DATA_DIR = "/root/clawd/projects/wemp-v2/.data";

interface FileSnapshot {
  existed: boolean;
  content: string;
}

function snapshotFile(file: string): FileSnapshot {
  if (!existsSync(file)) return { existed: false, content: "" };
  return { existed: true, content: readFileSync(file, "utf8") };
}

function restoreFile(file: string, snapshot: FileSnapshot): void {
  if (snapshot.existed) {
    writeFileSync(file, snapshot.content, "utf8");
    return;
  }
  rmSync(file, { force: true });
}

test("dedup persists seen keys across module reload", async (t) => {
  mkdirSync(DATA_DIR, { recursive: true });
  const dedupFile = path.join(DATA_DIR, "dedup.json");
  const dedupSnapshot = snapshotFile(dedupFile);

  t.after(() => {
    restoreFile(dedupFile, dedupSnapshot);
  });

  writeFileSync(dedupFile, "{}", "utf8");

  const seed = `${Date.now()}-${Math.random()}`;
  const key = `acct-${seed}:openid-${seed}:msg-${seed}:-:-:-`;

  const dedupUrlA = new URL("../src/dedup.ts", import.meta.url);
  dedupUrlA.searchParams.set("seed", `${seed}-a`);
  const dedupA = await import(dedupUrlA.href);
  assert.equal(dedupA.markIfNew(key, 60_000), true);
  assert.equal(dedupA.markIfNew(key, 60_000), false);

  const persisted = JSON.parse(readFileSync(dedupFile, "utf8")) as Record<string, number>;
  assert.equal(typeof persisted[key], "number");

  const dedupUrlB = new URL("../src/dedup.ts", import.meta.url);
  dedupUrlB.searchParams.set("seed", `${seed}-b`);
  const dedupB = await import(dedupUrlB.href);
  assert.equal(dedupB.markIfNew(key, 60_000), false);
});
