import test from "node:test";
import assert from "node:assert/strict";
import { resolveInboundAgent } from "../src/inbound.js";
import { resolvePairedAgent, resolveUnpairedAgent } from "../src/routing.js";
import type { ResolvedWempAccount } from "../src/types.js";

function accountFixture(): ResolvedWempAccount {
  return {
    accountId: "default",
    enabled: true,
    configured: true,
    appId: "app",
    appSecret: "secret",
    token: "token",
    webhookPath: "/wemp",
    dm: { policy: "pairing", allowFrom: [] },
    routing: { pairedAgent: "main", unpairedAgent: "wemp-kf" },
    knowledge: { mode: "local", providers: [{ type: "local", enabled: true, name: "local" }] },
    features: {
      menu: { enabled: false, items: [] },
      assistantToggle: { enabled: false, defaultEnabled: false },
      usageLimit: { enabled: false, dailyMessages: 0, dailyTokens: 0, exemptPaired: true },
      handoff: { enabled: false, contact: "", message: "" },
      welcome: { enabled: false, subscribeText: "" },
    },
    config: {},
  };
}

test("routing helpers return configured paired/unpaired agents", () => {
  const account = accountFixture();
  assert.equal(resolvePairedAgent(account), "main");
  assert.equal(resolveUnpairedAgent(account), "wemp-kf");
});

test("resolveInboundAgent follows paired flag", () => {
  const account = accountFixture();
  assert.equal(resolveInboundAgent(account, { openId: "o1", text: "hi", paired: true }), "main");
  assert.equal(resolveInboundAgent(account, { openId: "o2", text: "hi", paired: false }), "wemp-kf");
});
