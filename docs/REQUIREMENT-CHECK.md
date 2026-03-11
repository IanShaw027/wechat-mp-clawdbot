# wemp v2 需求符合度检查报告

## 检查方法

对比 chat.md 中的原始需求讨论、plan.md 中的实施计划、以及当前代码实现，全面检查插件规划是否符合需求。

---

## 一、核心需求对比

### 1.1 命名规范 ✅

**需求** (chat.md 314-328):
- channel: `wemp`
- 客服 agent: `wemp-kf`
- 已配对路由: `main`
- 未配对路由: `wemp-kf`

**实现状态**: ✅ 完全符合
- openclaw.plugin.json: `"id": "wemp"`
- onboarding.ts: 默认 `supportAgentId: "wemp-kf"`
- config.ts: `pairedAgent: "main"`, `unpairedAgent: "wemp-kf"`

---

### 1.2 双 Agent 路由模型 ✅

**需求** (chat.md 332-343):
- 渠道接入能力
- 双 agent 路由
- 安装时自动创建客服 agent
- 自动初始化 agent 基础文件
- 自动初始化知识库目录
- 引导用户设定客服人设
- 三种初始化模板
- wemp-kf 默认受限工具权限

**实现状态**: ⚠️ 部分符合
- ✅ 双 agent 路由逻辑已实现 (routing.ts)
- ✅ 自动创建客服 agent (scaffold.ts)
- ✅ 自动初始化基础文件 (templates.ts)
- ✅ 三种模板已实现 (enterprise/content/general)
- ✅ 受限权限已写入 AGENTS.md 模板
- ❌ 交互式引导用户设定人设未实现
- ❌ 受限权限只是文本约束，无硬限制

---

### 1.3 Onboarding 流程 ❌

**需求** (chat.md 348-399):

**阶段 1: 渠道接入配置**
- appId / appSecret / token / encodingAESKey / webhookPath / dm.policy

**阶段 2: 路由配置**
- 已配对用户使用哪个 agent？
- 未配对用户是否使用专属客服 agent？
- 客服 agent id？

**阶段 3: 自动创建 wemp-kf**
- 创建 agent 目录
- 生成基础文件 (IDENTITY/SOUL/USER/AGENTS/TOOLS)
- 生成知识库目录

**阶段 4: 客服人设初始化向导**
- 选择模板 (企业客服/内容助手/通用客服)
- 采集初始化信息 (品牌名称/服务对象/核心服务/联系方式/转人工规则/回复风格)

**实现状态**: ❌ 严重不符合
- ✅ onboarding.ts 有基础结构
- ✅ scaffold.ts 可以生成文件
- ✅ templates.ts 可以渲染模板
- ❌ 没有交互式向导实现
- ❌ 没有与 OpenClaw plugin SDK 的 onboarding 接口对接
- ❌ 用户无法在安装时进行配置

**关键问题**: 这是最大的需求缺口，整个 onboarding 体验完全缺失。

---

### 1.4 知识库向导问题 ❌

**需求** (chat.md 588-608):

**必问**:
- 你的品牌/公众号名称是什么？
- 主要服务哪些人？
- 核心提供什么产品或服务？
- 遇到什么问题必须转人工？
- 联系方式是什么？
- 希望客服更偏：专业咨询/内容推荐/通用接待

**可选**:
- 有没有推荐文章/官网链接？
- 有没有不能回答的话题？
- 希望回复风格偏：简洁/亲切/专业正式

**实现状态**: ❌ 完全不符合
- ✅ WempScaffoldAnswers 类型定义了这些字段
- ✅ buildDefaultOnboardingPlan 提供了默认值
- ❌ 没有交互式问答实现
- ❌ 用户无法在安装时回答这些问题

---

### 1.5 知识库模板 ⚠️

**需求** (chat.md 117-147):

**必填模板**:
- company.md (公司简介/品牌语气/面向人群)
- products.md (产品服务列表/适合谁)
- faq.md (高频问题/标准回答)
- contact.md (官网/邮箱/微信/电话/表单)
- escalation.md (哪些问题必须转人工/不能承诺/只能收集线索)

**可选模板**:
- articles.md
- cases.md
- pricing.md
- policies.md

**实现状态**: ⚠️ 部分符合
- ✅ 必填模板已实现 (company/products/faq/contact/escalation/articles)
- ❌ cases.md 未实现
- ❌ pricing.md 未实现
- ❌ policies.md 未实现
- ⚠️ 模板内容较简单，只有占位符

---

### 1.6 客服 Agent 权限模型 ⚠️

**需求** (chat.md 439-465):

**允许**:
- web_fetch
- web_search
- 知识库查询相关工具
- 必要的 channel 内回复能力

**禁止**:
- exec / read / write / edit
- browser / nodes / process
- message / sessions_* / gateway
- canvas / tts
- 其他高权限/跨渠道/系统级工具

**实现状态**: ⚠️ 仅文本约束
- ✅ templates.ts 中 AGENTS.md 已写入权限边界
- ❌ 没有真正的权限硬约束配置
- ❌ 仅靠生成的文本文件约束，agent 可能不遵守

**关键问题**: 需要确认 OpenClaw 是否支持 agent 级别的工具权限限制。

---

## 二、配置结构对比

### 2.1 主配置结构 ✅

**需求** (chat.md 614-633):
```json
{
  "channels": {
    "wemp": {
      "enabled": true,
      "appId": "...",
      "appSecret": "...",
      "token": "...",
      "encodingAESKey": "...",
      "webhookPath": "/wemp",
      "dm": {
        "policy": "pairing",
        "allowFrom": []
      },
      "routing": {
        "pairedAgent": "main",
        "unpairedAgent": "wemp-kf"
      }
    }
  }
}
```

**实现状态**: ✅ 完全符合
- config-schema.ts 定义了完整的 JSON Schema
- config.ts 实现了配置解析和默认值
- types.ts 定义了所有类型

**额外实现**: 还支持了 knowledge 和 features 配置，超出基础需求。

---

### 2.2 知识库配置 ✅

**需求** (plan.md 72-88):
- 知识来源模式: local / external / hybrid
- provider 目标: local markdown / dify / milvus / 可扩展

**实现状态**: ✅ 完全符合
- knowledge/index.ts 实现了统一入口
- knowledge/local.ts / dify.ts / milvus.ts 实现了三种 provider
- config.ts 支持 knowledge 配置解析

**问题**: Provider 实现只是骨架，需要真实联调。

---

### 2.3 增强功能配置 ✅

**需求** (plan.md 30-34):
- menu (默认关闭)
- assistant-toggle (默认关闭)
- usage-limit (默认关闭)
- onboarding 时可绑定知识库 provider

**实现状态**: ✅ 完全符合
- features/menu.ts 实现了菜单功能
- features/assistant-toggle.ts 实现了 AI 开关
- features/usage-limit.ts 实现了使用限制
- 所有功能默认关闭，需要显式启用

---

## 三、运行时规则对比

### 3.1 消息分流规则 ✅

**需求** (plan.md 37-40):
- 普通文本 -> inbound -> routing -> agent
- 菜单/AI开关/usage 查询 -> 优先走 feature 层
- subscribe/unsubscribe/验证类 -> 系统处理

**实现状态**: ✅ 完全符合
- webhook.ts 处理验证和事件
- inbound.ts 处理消息分流
- handleEventAction 处理菜单点击
- handleSubscribeEvent / handleUnsubscribeEvent 处理订阅事件

---

### 3.2 失败与降级策略 ⚠️

**需求** (plan.md 42-46):
- access_token 失败 -> 记录错误并快速失败
- 外部知识库失败 -> 降级为本地知识库 / 纯客服模式
- webhook 超时 -> 优先快速 ack
- 微信接口限流 -> 记录并降级

**实现状态**: ⚠️ 部分符合
- ✅ api.ts 实现了 token 过期重试
- ✅ webhook.ts 快速响应微信服务器
- ❌ 知识库失败没有降级逻辑
- ❌ 微信接口限流没有检测和降级

---

### 3.3 持久化策略 ✅

**需求** (plan.md 48-50):
- assistant-toggle / usage-limit / 未来 menu 状态需要本地持久化
- 使用按 accountId/openId 隔离的数据文件

**实现状态**: ✅ 基本符合
- ✅ storage.ts 实现了 JSON 文件持久化
- ✅ assistant-toggle.ts 和 usage-limit.ts 已接入持久化
- ⚠️ 当前是聚合文件，不是按账号/用户拆分文件

---

### 3.4 幂等/去重策略 ✅

**需求** (plan.md 52-54):
- 基于 msgId / eventKey 做短期去重
- 防止微信重试导致重复投递

**实现状态**: ✅ 完全符合
- dedup.ts 实现了基于多字段的去重
- webhook.ts 中调用去重逻辑
- 默认 5 分钟 TTL

**问题**: 去重记录只在内存中，重启后失效。

---

### 3.5 SessionKey 策略 ✅

**需求** (plan.md 56-58):
- 默认 sessionKey: `agent:<agentId>:wemp:<accountId>:dm:<openId>`
- 配对前后默认切换 agent，因此上下文隔离

**实现状态**: ✅ 完全符合
- runtime.ts 实现了 sessionKey 生成
- 格式完全符合需求

---

### 3.6 人工接管机制 ⚠️

**需求** (plan.md 60-62):
- 第一版先提供联系方式/转人工规则
- 后续可扩展为跨渠道通知

**实现状态**: ⚠️ 基础符合
- ✅ handoff feature 实现了联系方式返回
- ✅ escalation.md 模板包含转人工规则
- ❌ 没有跨渠道通知能力

---

### 3.7 脚手架重入策略 ✅

**需求** (plan.md 64-66):
- onboarding 再次执行时：不覆盖已有文件
- 仅补缺失文件，并输出变更清单

**实现状态**: ✅ 完全符合
- scaffold.ts 中 writeIfMissing 实现了保护逻辑
- 返回 created 和 skipped 清单

---

### 3.8 Feature 默认关闭原则 ✅

**需求** (plan.md 68-70):
- menu / assistant-toggle / usage-limit 默认为关闭
- 需要配置显式开启

**实现状态**: ✅ 完全符合
- config.ts 中所有 feature 默认值都是 false
- 需要在配置中显式 `enabled: true`

---

## 四、核心原则对比

### 4.1 基础能力优先 ✅

**需求** (plan.md 13):
- 基础能力优先，增强能力默认关闭

**实现状态**: ✅ 完全符合
- 基础消息链路已实现
- 增强功能都是可选的

---

### 4.2 Onboarding 不覆盖 ✅

**需求** (plan.md 14):
- onboarding 只初始化，不覆盖用户已有文件

**实现状态**: ✅ 完全符合
- scaffold.ts 实现了文件保护

---

### 4.3 知识库自由维护 ✅

**需求** (plan.md 15):
- 客服知识库允许用户自由维护

**实现状态**: ✅ 完全符合
- 生成的知识库文件都是 markdown
- 用户可以自由编辑

---

### 4.4 外部知识库绑定 ✅

**需求** (plan.md 16):
- 支持本地知识库 + 外部知识库绑定（Milvus / Dify / 可扩展 provider）

**实现状态**: ✅ 完全符合
- knowledge 系统支持多 provider
- 支持 local / dify / milvus

---

### 4.5 公开入口受限 ✅

**需求** (plan.md 17):
- 公开入口默认受限，未配对用户走 `wemp-kf`

**实现状态**: ✅ 完全符合
- dm.policy 默认为 "pairing"
- 未配对用户路由到 wemp-kf

---

## 五、V1 范围对比

### 5.1 V1 基础功能 ⚠️

**需求** (plan.md 19-28):
- ✅ 基础 channel 接入
- ✅ pairing + dm policy
- ✅ paired/unpaired routing
- ❌ 安装时创建 `wemp-kf` (代码已实现，但缺少交互式安装)
- ⚠️ 初始化基础文件与知识库目录 (代码已实现，但缺少交互式向导)
- ✅ 三种模板：企业客服 / 内容助手 / 通用客服
- ⚠️ `wemp-kf` 默认受限权限 (只有文本约束)
- ✅ 最小 webhook 文本闭环
- ✅ 文本 outbound API

**完成度**: 7/9 = 78%

---

### 5.2 V1 增强功能 ⚠️

**需求** (plan.md 30-34):
- ⚠️ menu（默认关闭）- API 已实现但未在 startAccount 中调用
- ✅ assistant-toggle（默认关闭）
- ✅ usage-limit（默认关闭）
- ⚠️ onboarding 时可绑定知识库 provider - 代码支持但缺少交互

**完成度**: 2/4 = 50%

---

## 六、关键缺失项总结

### 6.1 P0 级别缺失（阻塞上线）

1. **交互式 Onboarding 流程** ⭐⭐⭐⭐⭐
   - 需求明确：4 阶段安装向导
   - 实现状态：完全缺失
   - 影响：用户无法通过向导安装插件
   - 阻塞原因：不清楚 OpenClaw plugin SDK 的 onboarding 接口

2. **Webhook 与 HTTP 服务集成** ⭐⭐⭐⭐⭐
   - 需求明确：接收微信服务器推送
   - 实现状态：注册逻辑已实现，但不清楚如何接收请求
   - 影响：插件无法真正运行
   - 阻塞原因：不清楚 OpenClaw 如何将 HTTP 请求路由到 plugin

3. **Runtime 初始化** ⭐⭐⭐⭐⭐
   - 需求明确：plugin 生命周期管理
   - 实现状态：setWempRuntime 存在但调用时机不明确
   - 影响：plugin 无法正确初始化
   - 阻塞原因：不清楚 OpenClaw plugin 生命周期

---

### 6.2 P1 级别缺失（重要但可延后）

4. **Agent 权限硬约束** ⭐⭐⭐⭐
   - 需求明确：wemp-kf 应该有工具权限限制
   - 实现状态：只有文本约束
   - 影响：安全性不足
   - 需要确认：OpenClaw 是否支持 agent 级别的工具权限配置

5. **知识库 Provider 真实实现** ⭐⭐⭐
   - 需求明确：Dify / Milvus 真实调用
   - 实现状态：HTTP 骨架已实现
   - 影响：知识库功能不可用
   - 需要：真实环境联调

6. **Menu 自动同步** ⭐⭐⭐
   - 需求明确：启动时同步菜单
   - 实现状态：API 已实现但未调用
   - 影响：菜单配置不会生效
   - 修复：在 startAccount 中调用 syncWechatMenu

---

### 6.3 P2 级别缺失（可选增强）

7. **知识库模板内容完善** ⭐⭐
   - 需求明确：详细的模板内容
   - 实现状态：只有占位符
   - 影响：用户体验不佳

8. **可选知识库文件** ⭐⭐
   - 需求明确：cases.md / pricing.md / policies.md
   - 实现状态：未实现
   - 影响：功能不完整

9. **媒体消息处理** ⭐⭐
   - 需求：图片/语音/视频处理
   - 实现状态：只有占位符
   - 影响：功能受限

---

## 七、规划符合度评分

| 维度 | 符合度 | 说明 |
|------|--------|------|
| 命名规范 | 100% | 完全符合 |
| 配置结构 | 100% | 完全符合，甚至超出需求 |
| 双 Agent 路由 | 90% | 核心逻辑完整，缺少交互式配置 |
| Onboarding 流程 | 20% | 代码基础完整，但交互式向导完全缺失 |
| 知识库模板 | 60% | 必填模板已实现，可选模板缺失，内容简单 |
| 权限模型 | 50% | 文本约束已实现，硬约束缺失 |
| 运行时规则 | 85% | 大部分规则已实现，降级策略不完整 |
| 核心原则 | 100% | 完全符合 |
| V1 基础功能 | 78% | 大部分已实现 |
| V1 增强功能 | 50% | 部分已实现 |
| **总体符合度** | **73%** | 基础扎实，但关键交互缺失 |

---

## 八、结论与建议

### 8.1 总体评价

**优点**:
1. ✅ 架构设计完全符合需求，模块划分清晰
2. ✅ 配置系统完整，支持多账号、多 provider
3. ✅ 核心消息链路已实现，逻辑正确
4. ✅ 持久化、去重、缓存等基础设施完善
5. ✅ 代码质量高，类型定义完整

**缺点**:
1. ❌ 交互式 Onboarding 完全缺失（最大问题）
2. ❌ 与 OpenClaw 平台集成的关键点不明确
3. ❌ Agent 权限只有文本约束，无硬限制
4. ⚠️ 知识库 Provider 需要真实联调
5. ⚠️ 模板内容较简单

### 8.2 符合度判断

**规划是否符合需求？** ✅ 是的，规划完全符合需求。

**实现是否符合规划？** ⚠️ 部分符合，核心逻辑完整，但交互式体验缺失。

**关键问题**: 不是规划问题，而是实现问题。规划非常清晰完整，但实现中最关键的 Onboarding 交互式向导完全缺失，这是因为不清楚 OpenClaw plugin SDK 的 onboarding 接口如何使用。

### 8.3 行动建议

**第一优先级**（解决阻塞）:
1. 研究 OpenClaw plugin SDK 文档，了解：
   - Onboarding 接口规范和使用方法
   - Webhook 如何注册到 HTTP 服务器
   - Runtime 初始化流程
   - Agent 权限配置方法

2. 实现交互式 Onboarding 向导：
   - 4 阶段安装流程
   - 用户输入采集
   - 知识库向导问题

**第二优先级**（完善功能）:
3. 在 startAccount 中调用 syncWechatMenu
4. 联调知识库 Provider（Dify/Milvus）
5. 完善知识库模板内容
6. 添加可选知识库文件

**第三优先级**（增强体验）:
7. 实现媒体消息处理
8. 完善错误处理与降级
9. 添加测试
10. 完善文档

### 8.4 最终结论

**插件规划完全符合需求**，设计思路清晰，架构合理。当前实现已完成约 73% 的需求，基础架构扎实。

**最大问题**是交互式 Onboarding 体验完全缺失，这不是规划问题，而是因为不清楚 OpenClaw plugin SDK 的接口如何使用。一旦解决了与 OpenClaw 平台集成的关键问题，插件就可以快速完善并上线。

**建议**: 优先解决 P0 级别的 3 个阻塞点（Onboarding/Webhook/Runtime），然后在真实环境中进行端到端测试。
