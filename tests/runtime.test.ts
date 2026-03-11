import test from "node:test";
import assert from "node:assert/strict";
import { clearWempRuntime, dispatchToAgent, setWempRuntime, trySetWempRuntime } from "../src/runtime.js";

function rememberEnv(keys: string[]): Record<string, string | undefined> {
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test("dispatchToAgent builds expected payload and sessionKey", async (t) => {
  let captured: Record<string, unknown> | null = null;
  setWempRuntime({
    channel: {
      dispatchInbound: async (payload: Record<string, unknown>) => {
        captured = payload;
      },
    },
  } as any);

  t.after(() => clearWempRuntime());

  const result = await dispatchToAgent({
    channel: "wemp",
    accountId: "acc-1",
    openId: "open-1",
    agentId: "main",
    text: "hello",
    messageId: "m-1",
  });

  assert.equal(result.accepted, true);
  assert.equal(result.sessionKey, "agent:main:wemp:acc-1:dm:open-1");
  assert.ok(captured);
  const payload = captured as Record<string, unknown>;
  assert.equal(payload["sessionKey"], "agent:main:wemp:acc-1:dm:open-1");
  assert.equal(payload["chatType"], "direct");
  assert.equal(payload["targetAgentId"], "main");
});

test("dispatchToAgent supports runtime chatType and sessionKey template overrides", async (t) => {
  const previousTemplate = process.env.WEMP_RUNTIME_SESSION_KEY_TEMPLATE;
  const previousChatType = process.env.WEMP_RUNTIME_CHAT_TYPE;
  process.env.WEMP_RUNTIME_SESSION_KEY_TEMPLATE = "sess:{accountId}:{openId}:{agentId}";
  process.env.WEMP_RUNTIME_CHAT_TYPE = "group";

  let captured: Record<string, unknown> | null = null;
  setWempRuntime({
    channel: {
      dispatchInbound: async (payload: Record<string, unknown>) => {
        captured = payload;
      },
    },
  } as any);

  t.after(() => {
    clearWempRuntime();
    if (previousTemplate === undefined) delete process.env.WEMP_RUNTIME_SESSION_KEY_TEMPLATE;
    else process.env.WEMP_RUNTIME_SESSION_KEY_TEMPLATE = previousTemplate;
    if (previousChatType === undefined) delete process.env.WEMP_RUNTIME_CHAT_TYPE;
    else process.env.WEMP_RUNTIME_CHAT_TYPE = previousChatType;
  });

  const result = await dispatchToAgent({
    channel: "wemp",
    accountId: "acc-x",
    openId: "open-y",
    agentId: "agent-z",
    text: "hello",
  });

  assert.equal(result.accepted, true);
  assert.equal(result.sessionKey, "sess:acc-x:open-y:agent-z");
  assert.ok(captured);
  assert.equal(captured?.["sessionKey"], "sess:acc-x:open-y:agent-z");
  assert.equal(captured?.["chatType"], "group");
});

test("dispatchToAgent rejects invalid chatType when runtime validation is enabled", async (t) => {
  const envSnapshot = rememberEnv([
    "WEMP_RUNTIME_VALIDATE",
    "WEMP_RUNTIME_CHAT_TYPE",
    "WEMP_RUNTIME_SESSION_KEY_TEMPLATE",
  ]);
  process.env.WEMP_RUNTIME_VALIDATE = "1";
  process.env.WEMP_RUNTIME_CHAT_TYPE = "room";
  delete process.env.WEMP_RUNTIME_SESSION_KEY_TEMPLATE;

  let dispatchCalls = 0;
  setWempRuntime({
    channel: {
      dispatchInbound: async () => {
        dispatchCalls += 1;
      },
    },
  } as any);

  t.after(() => {
    clearWempRuntime();
    restoreEnv(envSnapshot);
  });

  const result = await dispatchToAgent({
    channel: "wemp",
    accountId: "acc-v",
    openId: "open-v",
    agentId: "agent-v",
    text: "hello",
  });

  assert.equal(result.accepted, false);
  assert.match(result.note || "", /chatType/i);
  assert.equal(dispatchCalls, 0);
});

test("dispatchToAgent rejects invalid sessionKey template when runtime validation is enabled", async (t) => {
  const envSnapshot = rememberEnv([
    "WEMP_RUNTIME_VALIDATE",
    "WEMP_RUNTIME_CHAT_TYPE",
    "WEMP_RUNTIME_SESSION_KEY_TEMPLATE",
  ]);
  process.env.WEMP_RUNTIME_VALIDATE = "1";
  process.env.WEMP_RUNTIME_CHAT_TYPE = "direct";
  process.env.WEMP_RUNTIME_SESSION_KEY_TEMPLATE = "sess:{accountId}:{openId}";

  let dispatchCalls = 0;
  setWempRuntime({
    channel: {
      dispatchInbound: async () => {
        dispatchCalls += 1;
      },
    },
  } as any);

  t.after(() => {
    clearWempRuntime();
    restoreEnv(envSnapshot);
  });

  const result = await dispatchToAgent({
    channel: "wemp",
    accountId: "acc-v2",
    openId: "open-v2",
    agentId: "agent-v2",
    text: "hello",
  });

  assert.equal(result.accepted, false);
  assert.match(result.note || "", /template/i);
  assert.equal(dispatchCalls, 0);
});

test("dispatchToAgent rejects sessionKey over max length", async (t) => {
  const envSnapshot = rememberEnv([
    "WEMP_RUNTIME_VALIDATE",
    "WEMP_RUNTIME_SESSION_KEY_MAX_LEN",
    "WEMP_RUNTIME_SESSION_KEY_TEMPLATE",
    "WEMP_RUNTIME_CHAT_TYPE",
  ]);
  delete process.env.WEMP_RUNTIME_VALIDATE;
  process.env.WEMP_RUNTIME_SESSION_KEY_MAX_LEN = "12";
  process.env.WEMP_RUNTIME_SESSION_KEY_TEMPLATE = "sess:{agentId}:{channel}:{accountId}:{openId}";
  delete process.env.WEMP_RUNTIME_CHAT_TYPE;

  let dispatchCalls = 0;
  setWempRuntime({
    channel: {
      dispatchInbound: async () => {
        dispatchCalls += 1;
      },
    },
  } as any);

  t.after(() => {
    clearWempRuntime();
    restoreEnv(envSnapshot);
  });

  const result = await dispatchToAgent({
    channel: "wemp",
    accountId: "acc-long",
    openId: "open-long",
    agentId: "agent-long",
    text: "hello",
  });

  assert.equal(result.accepted, false);
  assert.match(result.note || "", /exceeds max 12/i);
  assert.equal(dispatchCalls, 0);
});

test("trySetWempRuntime supports direct dispatchInbound shape", async (t) => {
  let count = 0;
  const ok = trySetWempRuntime({
    dispatchInbound: async () => {
      count += 1;
    },
  });
  assert.equal(ok, true);
  await dispatchToAgent({
    channel: "wemp",
    accountId: "acc-2",
    openId: "open-2",
    agentId: "wemp-kf",
    text: "hi",
  });
  assert.equal(count, 1);
  t.after(() => clearWempRuntime());
});

test("dispatchToAgent returns rejected note when runtime missing", async () => {
  clearWempRuntime();
  await assert.rejects(
    async () => dispatchToAgent({
      channel: "wemp",
      accountId: "acc-3",
      openId: "open-3",
      agentId: "main",
      text: "x",
    }),
  );
});
