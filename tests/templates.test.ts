import test from "node:test";
import assert from "node:assert/strict";
import { renderAgentFiles, renderKnowledgeFiles } from "../src/templates.js";
import type { WempScaffoldAnswers } from "../src/types.js";

function buildAnswers(template: WempScaffoldAnswers["template"]): WempScaffoldAnswers {
  return {
    brandName: "Test Brand",
    audience: "SMB 用户",
    services: "- 智能问答\n- 咨询转化",
    contact: "微信: test-brand",
    escalationRules: "报价与投诉转人工",
    tone: "专业",
    template,
  };
}

test("renderAgentFiles contains template-specific conversation guidance", () => {
  const enterprise = renderAgentFiles(buildAnswers("enterprise"))["AGENTS.md"];
  const content = renderAgentFiles(buildAnswers("content"))["AGENTS.md"];
  const general = renderAgentFiles(buildAnswers("general"))["AGENTS.md"];

  assert.match(enterprise, /合作意向|业务目标/);
  assert.match(content, /内容推荐|相关文章/);
  assert.match(general, /直接回答核心问题/);
});

test("renderKnowledgeFiles provides structured templates for key documents", () => {
  const files = renderKnowledgeFiles(buildAnswers("enterprise"));
  assert.match(files["company.md"], /基础信息/);
  assert.match(files["products.md"], /每项服务建议补充字段/);
  assert.match(files["faq.md"], /建议格式/);
  assert.match(files["contact.md"], /建议标准格式/);
  assert.match(files["escalation.md"], /触发条件/);
  assert.match(files["articles.md"], /记录格式/);
});
