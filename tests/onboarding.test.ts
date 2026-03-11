import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { buildOnboardingPlan, executeWempOnboarding, wempOnboardingStages } from "../src/onboarding.js";

test("buildOnboardingPlan applies patches and defaults", () => {
  const plan = buildOnboardingPlan({
    supportAgentId: "wemp-kf-custom",
    brandName: "Acme",
    template: "content",
    knowledgeMode: "hybrid",
  });
  assert.equal(plan.supportAgentId, "wemp-kf-custom");
  assert.equal(plan.unpairedAgentId, "wemp-kf-custom");
  assert.equal(plan.answers.brandName, "Acme");
  assert.equal(plan.answers.template, "content");
  assert.equal(plan.knowledgeMode, "hybrid");
  assert.ok(plan.knowledgeProviders.length > 0);
});

test("executeWempOnboarding scaffolds agent files and knowledge files", () => {
  const workspace = mkdtempSync(path.join(tmpdir(), "wemp-onboarding-"));
  const result = executeWempOnboarding(workspace, {
    supportAgentId: "wemp-kf",
    brandName: "Test Brand",
    audience: "SMB",
    services: "AI Support",
    contact: "test@example.com",
    escalationRules: "报价与投诉转人工",
    tone: "专业",
    template: "enterprise",
  });
  assert.ok(result.created.length > 0);
  assert.ok(result.agentRoot);
  assert.ok(result.summary.length > 0);

  const identityPath = path.join(result.agentRoot || "", "IDENTITY.md");
  const identity = readFileSync(identityPath, "utf8");
  assert.match(identity, /Test Brand/);

  const casesPath = path.join(result.agentRoot || "", "knowledge", "cases.md");
  const cases = readFileSync(casesPath, "utf8");
  assert.match(cases, /案例与场景/);
});

test("wempOnboardingStages contains required 4-stage wizard definitions", () => {
  assert.equal(wempOnboardingStages.length, 4);
  const ids = wempOnboardingStages.map((item) => item.id);
  assert.deepEqual(ids, ["channel-access", "routing", "scaffold", "persona"]);
  const persona = wempOnboardingStages.find((item) => item.id === "persona");
  assert.ok(persona);
  assert.ok(persona?.questions.some((q) => q.id === "brandName" && q.required));
  assert.ok(persona?.questions.some((q) => q.id === "recommendedLinks" && !q.required));
});
