import test from "node:test";
import assert from "node:assert/strict";
import { resolveWempAccount, validateResolvedWempAccount, validateWempChannelConfig } from "../src/config.js";

test("resolveWempAccount applies defaults for routing and features", () => {
  const resolved = resolveWempAccount({
    channels: {
      wemp: {
        enabled: true,
        appId: "app-x",
        appSecret: "secret-x",
        token: "token-x",
      },
    },
  });

  assert.equal(resolved.configured, true);
  assert.equal(resolved.routing.pairedAgent, "main");
  assert.equal(resolved.routing.unpairedAgent, "wemp-kf");
  assert.equal(resolved.features.menu.enabled, false);
  assert.equal(resolved.features.assistantToggle.enabled, false);
  assert.equal(resolved.features.usageLimit.enabled, false);
});

test("resolveWempAccount supports account-level overrides", () => {
  const resolved = resolveWempAccount({
    channels: {
      wemp: {
        enabled: true,
        appId: "app-root",
        appSecret: "secret-root",
        token: "token-root",
        routing: {
          pairedAgent: "main",
          unpairedAgent: "wemp-kf",
        },
        accounts: {
          brandA: {
            appId: "app-a",
            appSecret: "secret-a",
            token: "token-a",
            routing: {
              pairedAgent: "agent-a",
              unpairedAgent: "kf-a",
            },
          },
        },
      },
    },
  }, "brandA");

  assert.equal(resolved.accountId, "brandA");
  assert.equal(resolved.appId, "app-a");
  assert.equal(resolved.routing.pairedAgent, "agent-a");
  assert.equal(resolved.routing.unpairedAgent, "kf-a");
});

test("validateResolvedWempAccount includes account context and fix hints for missing fields", () => {
  const resolved = resolveWempAccount({
    channels: {
      wemp: {
        enabled: true,
        accounts: {
          brandA: {
            enabled: true,
          },
        },
      },
    },
  }, "brandA");

  const issues = validateResolvedWempAccount(resolved);
  const appIdIssue = issues.find((item) => item.includes("appId missing"));
  assert.ok(appIdIssue);
  assert.ok(appIdIssue.includes("accountId=brandA"));
  assert.ok(appIdIssue.includes("field=appId"));
  assert.ok(appIdIssue.includes("channels.wemp.accounts.brandA.appId"));
  assert.ok(appIdIssue.includes("channels.wemp.appId"));
});

test("validateResolvedWempAccount catches invalid webhookPath and aes key length", () => {
  const resolved = resolveWempAccount({
    channels: {
      wemp: {
        enabled: true,
        appId: "app-x",
        appSecret: "secret-x",
        token: "token-x",
        webhookPath: "invalid-path",
        encodingAESKey: "short",
      },
    },
  });
  const issues = validateResolvedWempAccount(resolved);
  const webhookIssue = issues.find((item) => item.includes("webhookPath must start with '/'"));
  assert.ok(webhookIssue);
  assert.ok(webhookIssue.includes("accountId=default"));
  assert.ok(webhookIssue.includes("field=webhookPath"));
  assert.ok(webhookIssue.includes("current=invalid-path"));
  assert.ok(webhookIssue.includes("channels.wemp.webhookPath"));

  const aesIssue = issues.find((item) => item.includes("encodingAESKey should be 43 chars"));
  assert.ok(aesIssue);
  assert.ok(aesIssue.includes("accountId=default"));
  assert.ok(aesIssue.includes("field=encodingAESKey"));
  assert.ok(aesIssue.includes("currentLength=5"));
  assert.ok(aesIssue.includes("channels.wemp.encodingAESKey"));
  assert.equal(resolved.configured, false);
});

test("validateWempChannelConfig catches webhook path conflicts", () => {
  const issues = validateWempChannelConfig({
    channels: {
      wemp: {
        enabled: true,
        appId: "app-root",
        appSecret: "secret-root",
        token: "token-root",
        webhookPath: "/wemp",
        accounts: {
          a1: {
            appId: "a1",
            appSecret: "s1",
            token: "t1",
            webhookPath: "/same",
          },
          a2: {
            appId: "a2",
            appSecret: "s2",
            token: "t2",
            webhookPath: "/same",
          },
        },
      },
    },
  });
  const conflictIssue = issues.find((item) => item.includes("webhookPath conflict"));
  assert.ok(conflictIssue);
  assert.ok(conflictIssue.includes("accountIds=a1,a2"));
  assert.ok(conflictIssue.includes("field=webhookPath"));
  assert.ok(conflictIssue.includes("channels.wemp.accounts.a1.webhookPath"));
  assert.ok(conflictIssue.includes("channels.wemp.accounts.a2.webhookPath"));
});

test("validateWempChannelConfig reports schema type errors with fix hints", () => {
  const issues = validateWempChannelConfig({
    channels: {
      wemp: {
        enabled: true,
        appId: "app",
        appSecret: "secret",
        token: 123 as any,
      } as any,
    },
  });
  const typeIssue = issues.find((item) => item.includes("schema must be string"));
  assert.ok(typeIssue);
  assert.ok(typeIssue.includes("field=channels.wemp.token"));
  assert.ok(typeIssue.includes("set channels.wemp.token as string"));
});

test("validateWempChannelConfig reports unsupported fields with fix hints", () => {
  const issues = validateWempChannelConfig({
    channels: {
      wemp: {
        enabled: true,
        appId: "app",
        appSecret: "secret",
        token: "token",
        unknownFlag: true,
      } as any,
    },
  });
  const extraIssue = issues.find((item) => item.includes("schema must NOT have additional properties"));
  assert.ok(extraIssue);
  assert.ok(extraIssue.includes("field=channels.wemp.unknownFlag"));
  assert.ok(extraIssue.includes("remove unsupported field channels.wemp.unknownFlag"));
});
