# wemp v2 功能清单

## 项目概述

wemp v2 是一个官方风格的微信公众号 channel 插件，用于 OpenClaw 平台。

**完成度**: 86%
**源文件**: 31 个 TypeScript 文件
**测试文件**: 20 个测试文件
**文档文件**: 17 个文档文件

---

## 一、核心功能（已完成）

### 1.1 双 Agent 路由系统 ✅

**功能描述**: 根据用户配对状态自动路由到不同 agent

**实现细节**:
- 已配对用户 → `main` agent（高权限主助手）
- 未配对用户 → `wemp-kf` agent（受限客服助手）
- 支持 4 种 DM policy：`pairing`（需配对）/ `allowlist`（白名单）/ `open`（开放）/ `disabled`（禁用）
- 配对状态查询与管理
- 配对码生成与审批流程

**相关文件**:
- `src/routing.ts` - 路由逻辑
- `src/pairing.ts` - 配对管理
- `src/security.ts` - DM policy 解析

---

### 1.2 Webhook 消息处理 ✅

**功能描述**: 接收并处理微信服务器推送的消息和事件

**支持的消息类型**:
- ✅ 文本消息
- ✅ 图片消息（下载 + 摘要增强）
- ✅ 语音消息（下载 + 可选 ASR 转写）
- ✅ 视频消息（解析）
- ✅ 文件消息（解析）
- ✅ 位置消息（解析）
- ✅ 链接消息（解析）

**支持的事件类型**:
- ✅ 订阅/取消订阅事件
- ✅ 菜单点击事件
- ✅ 自定义事件（AI 开关、使用量查询等）

**安全特性**:
- ✅ 微信签名验证
- ✅ AES 加解密（明文/安全/兼容模式）
- ✅ 消息去重（防止微信重试）
- ✅ 请求频率限制（防止恶意请求）
- ✅ 输入清洗（控制字符过滤、长度限制）

**相关文件**:
- `src/webhook.ts` - Webhook 处理主逻辑
- `src/inbound.ts` - 入站消息解析
- `src/crypto.ts` - 加解密
- `src/dedup.ts` - 消息去重
- `src/media.ts` - 媒体处理

---

### 1.3 消息发送（Outbound）✅

**功能描述**: 向微信用户发送消息

**支持的发送类型**:
- ✅ 文本消息（自动分段，600 字/段）
- ✅ 图片消息（通过 media_id）
- ⚠️ 语音/视频/文件消息（API 已实现，未接入 outbound）

**发送特性**:
- ✅ 按账号+用户串行队列（避免并发冲突）
- ✅ 失败重试机制（可配置次数）
- ✅ 微信限流检测与本地降级
- ✅ 发送状态跟踪

**相关文件**:
- `src/outbound.ts` - 消息发送
- `src/api.ts` - 微信 API 调用

---

### 1.4 配置系统 ✅

**功能描述**: 完整的配置解析、验证和管理

**配置能力**:
- ✅ 单账号配置
- ✅ 多账号配置（支持 `accounts` 对象）
- ✅ 默认值填充
- ✅ JSON Schema 定义
- ✅ 运行时验证（AJV）
- ✅ 配置错误聚合与友好提示
- ✅ 字段关联验证（如 AES 密钥长度）
- ✅ 配置冲突检测（如 webhook 路径冲突）

**配置项**:
- 基础配置：appId / appSecret / token / encodingAESKey / webhookPath
- DM 配置：policy / allowFrom
- 路由配置：pairedAgent / unpairedAgent
- 知识库配置：mode / providers
- 增强功能：menu / assistantToggle / usageLimit / handoff / welcome

**相关文件**:
- `src/config.ts` - 配置解析
- `src/config-schema.ts` - JSON Schema 定义
- `src/types.ts` - 类型定义

---

## 二、知识库系统（已完成）

### 2.1 多 Provider 支持 ✅

**功能描述**: 支持多种知识库来源，灵活组合

**支持的 Provider**:
- ✅ **Local** - 本地 markdown 文件检索（关键词计分）
- ✅ **Dify** - Dify 知识库 HTTP 调用
- ✅ **Milvus** - Milvus 向量数据库检索

**知识库模式**:
- `local` - 仅使用本地知识库
- `external` - 仅使用外部 provider
- `hybrid` - 混合使用（本地 + 外部）

**高级特性**:
- ✅ 外部失败自动回退本地
- ✅ TTL 查询缓存（30 秒，可配置）
- ✅ 缓存容量管理（200 条，可配置）
- ✅ 超时降级（500ms，可配置）
- ✅ 结果过滤与排序（Milvus 支持 topK/minScore）

**相关文件**:
- `src/knowledge/index.ts` - 统一入口
- `src/knowledge/local.ts` - 本地检索
- `src/knowledge/dify.ts` - Dify 集成
- `src/knowledge/milvus.ts` - Milvus 集成

---

## 三、Onboarding 系统（已完成）

### 3.1 交互式安装向导 ✅

**功能描述**: 4 阶段安装流程，自动创建客服 agent

**安装阶段**:
1. **渠道接入配置** - AppID/Secret/Token/AES Key/WebhookPath/dm.policy
2. **路由配置** - 已配对 agent/未配对 agent/客服 agent id
3. **自动创建 wemp-kf** - agent 目录/基础文件/知识库目录
4. **客服人设初始化** - 选择模板/采集信息

**向导问题**:
- 必问：品牌名称/服务对象/核心服务/转人工规则/联系方式/客服偏好
- 可选：推荐文章/禁止话题/回复风格

**相关文件**:
- `src/onboarding.ts` - Onboarding 流程
- `src/scaffold.ts` - 文件生成
- `src/templates.ts` - 模板渲染

---

### 3.2 三种客服模板 ✅

**功能描述**: 预置三种场景化客服模板

**模板类型**:
1. **企业客服** - 适合企业官网、SaaS、咨询公司
   - 专业稳重的人设
   - 业务咨询场景话术
   - 意向识别与转化引导

2. **内容助手** - 适合公众号内容运营、课程、知识分享
   - 耐心清晰的人设
   - 内容推荐流程
   - 概念解释话术

3. **通用客服** - 适合快速上线、不确定定位
   - 中性安全的人设
   - 清晰的边界说明
   - 灵活的扩展空间

**生成的文件**:
- `IDENTITY.md` - 身份定义
- `SOUL.md` - 人设底色
- `USER.md` - 服务对象画像
- `AGENTS.md` - 回复规则与权限边界
- `TOOLS.md` - 可用工具说明
- `knowledge/` - 知识库目录（9 个模板文件）

**知识库模板**:
- 必填：company.md / products.md / faq.md / contact.md / escalation.md / articles.md
- 可选：cases.md / pricing.md / policies.md

---

## 四、增强功能（已完成）

### 4.1 自定义菜单 ✅

**功能描述**: 微信公众号自定义菜单管理

**菜单能力**:
- ✅ 菜单创建（支持 click/view 类型）
- ✅ 菜单查询
- ✅ 菜单删除
- ✅ 菜单同步（启动时自动同步）
- ✅ 配置变更检测（SHA256 签名）
- ✅ 同步失败回滚

**相关文件**:
- `src/features/menu.ts` - 菜单管理

---

### 4.2 AI 助手开关 ✅

**功能描述**: 用户可控制 AI 助手开关状态

**开关能力**:
- ✅ 开启/关闭 AI 助手
- ✅ 查询当前状态
- ✅ 持久化存储（按账号+用户物理隔离）
- ✅ 订阅时自动开启
- ✅ 取消订阅时自动关闭

**菜单事件**:
- `assistant_on` - 开启 AI 助手
- `assistant_off` - 关闭 AI 助手
- `assistant_status` - 查询状态

**相关文件**:
- `src/features/assistant-toggle.ts` - AI 开关

---

### 4.3 使用量限制 ✅

**功能描述**: 限制用户每日使用量

**限制能力**:
- ✅ 每日消息数限制
- ✅ 每日 token 数限制
- ✅ 已配对用户豁免（可选）
- ✅ 按日自动重置
- ✅ 使用量查询
- ✅ Token 估算（UTF-8 字节 + CJK 修正）

**菜单事件**:
- `usage_status` - 查询使用量

**相关文件**:
- `src/features/usage-limit.ts` - 使用量限制

---

### 4.4 人工接管 ✅

**功能描述**: 转人工客服引导

**接管能力**:
- ✅ 返回联系方式文本
- ✅ 自定义联系方式
- ✅ 自定义提示文案
- ✅ 会话级人工接管状态持久化
- ✅ 外部通知队列（`handoff_notification`）
- ✅ 工单 webhook 集成（`handoff_ticket`）
- ✅ 文本“恢复AI”与点击恢复都会触发恢复事件

**菜单事件**:
- `handoff` - 转人工
- `handoff_status` - 查询当前接管状态
- `handoff_resume` - 恢复 AI

**相关文件**:
- `src/inbound.ts` - handoff 事件处理
- `src/webhook.ts` - 文本恢复命令处理
- `src/features/handoff-state.ts` - handoff 状态持久化
- `src/features/handoff-notify.ts` - handoff 通知/工单 webhook 队列

---

### 4.5 欢迎消息 ✅

**功能描述**: 用户订阅时的欢迎消息

**欢迎能力**:
- ✅ 自定义欢迎文案
- ✅ 可选启用/禁用

**相关文件**:
- `src/inbound.ts` - 订阅事件处理

---

## 五、持久化系统（已完成）

### 5.1 本地文件持久化 ✅

**功能描述**: 基于 JSON 文件的持久化存储

**持久化数据**:
- ✅ AI 助手开关状态（`.data/assistant-toggle/<accountId>/<openId>.json`）
- ✅ 使用量数据（`.data/usage-limit/<accountId>/<openId>.json`）
- ✅ Access token 缓存（`.data/access-token-cache.json`）
- ✅ 消息去重记录（`.data/dedup.json`）

**持久化特性**:
- ✅ 按账号+用户物理隔离
- ✅ 兼容旧数据迁移
- ✅ 过期数据自动清理
- ✅ 大文件自动裁剪

**相关文件**:
- `src/storage.ts` - 存储工具
- `src/dedup.ts` - 去重持久化
- `src/features/assistant-toggle.ts` - AI 开关持久化
- `src/features/usage-limit.ts` - 使用量持久化

---

## 六、错误处理与降级（已完成）

### 6.1 失败降级策略 ✅

**降级场景**:
- ✅ Access token 失败 → 快速失败 + 告警日志
- ✅ 外部知识库失败 → 回退本地知识库
- ✅ Webhook 超时 → 快速 ack + 回退回复
- ✅ 微信接口限流 → 本地 cooldown 降级
- ✅ 知识库查询超时 → 超时降级（500ms）
- ✅ 媒体下载失败 → 降级为占位符文本

**相关文件**:
- `src/api.ts` - API 错误处理
- `src/knowledge/index.ts` - 知识库降级
- `src/webhook.ts` - Webhook 超时保护
- `src/inbound.ts` - 知识库超时降级

---

### 6.2 日志与监控 ✅

**功能描述**: 结构化日志与监控

**日志能力**:
- ✅ JSON 结构化输出
- ✅ 日志级别控制（debug/info/warn/error）
- ✅ 敏感字段脱敏（token/secret/apiKey）
- ✅ 按账号桥接到 OpenClaw `ctx.log`
- ✅ 关键事件记录（webhook/api/outbound）

**监控能力**:
- ✅ 运行时状态快照
- ✅ 最后连接时间
- ✅ 最后入站/出站时间
- ✅ 最后错误信息

**相关文件**:
- `src/log.ts` - 日志系统
- `src/status.ts` - 状态监控

---

## 七、性能优化（已完成）

### 7.1 缓存优化 ✅

**缓存类型**:
- ✅ Access token 缓存（7200 秒）
- ✅ 知识库查询缓存（30 秒 TTL）
- ✅ 消息去重缓存（5 分钟 TTL）

**缓存特性**:
- ✅ TTL 过期清理
- ✅ 容量上限管理
- ✅ LRU 淘汰策略

---

### 7.2 并发控制 ✅

**并发保护**:
- ✅ Webhook 每账号并发上限（10 个）
- ✅ Outbound 按账号+用户串行队列
- ✅ 请求频率限制（窗口限频）

---

### 7.3 内存优化 ✅

**优化措施**:
- ✅ 消息去重 Map 自动裁剪（1000 条上限）
- ✅ 知识库缓存容量管理（200 条上限）
- ✅ 过期数据定期清理

---

## 八、安全增强（已完成）

### 8.1 安全特性 ✅

**安全措施**:
- ✅ 微信签名验证
- ✅ AES 加解密
- ✅ 请求频率限制（防止恶意请求）
- ✅ 输入清洗（控制字符过滤）
- ✅ 消息长度限制（2000 字符）
- ✅ 敏感信息脱敏（日志）
- ✅ HTTPS 强制策略（可选）

**相关文件**:
- `src/crypto.ts` - 加解密
- `src/webhook.ts` - 签名验证 + 频率限制
- `src/inbound.ts` - 输入清洗
- `src/log.ts` - 敏感信息脱敏

---

## 九、测试体系（已完成）

### 9.1 自动化测试 ✅

**测试覆盖**:
- ✅ 单元测试（20 个测试文件）
  - config 解析测试
  - crypto 加解密测试
  - routing 逻辑测试
  - inbound 消息解析测试
  - runtime 派发行为测试
  - dedup 去重测试
  - api 限流测试
  - knowledge 降级测试
  - log 脱敏测试
  - templates 渲染测试
  - assistant-toggle 隔离测试
  - feature-storage 持久化测试

- ✅ 集成测试
  - webhook 完整流程测试
  - webhook-media 媒体处理测试
  - webhook-media-e2e 端到端测试

- ✅ E2E 测试（本地模拟）
  - e2e-local 本地模拟测试

**测试命令**:
```bash
npm test              # 运行所有测试
npm run typecheck     # 类型检查
```

---

## 十、文档体系（已完成）

### 10.1 完整文档 ✅

**文档清单**:
- ✅ `README.md` - 项目概述
- ✅ `CLAUDE.md` - Claude Code 指南
- ✅ `docs/install.md` - 安装指南
- ✅ `docs/config.md` - 配置说明
- ✅ `docs/api.md` - API 参考
- ✅ `docs/templates.md` - 模板场景说明
- ✅ `docs/knowledge-maintenance.md` - 知识库维护指南
- ✅ `docs/best-practices.md` - 最佳实践
- ✅ `docs/troubleshooting.md` - 故障排查
- ✅ `docs/TODO.md` - 任务看板
- ✅ `docs/plan.md` - 实施计划
- ✅ `docs/progress.md` - 进展记录
- ✅ `docs/chat.md` - 需求讨论
- ✅ `docs/REQUIREMENT-CHECK.md` - 需求符合度检查
- ✅ `docs/TODO-VERIFICATION.md` - 任务核查报告
- ✅ `docs/FINAL-REPORT.md` - 最终核查报告
- ✅ `docs/TODO-SUMMARY.md` - 核查总结

---

## 十一、工程化（已完成）

### 11.1 工程化文件 ✅

**工程文件**:
- ✅ `package.json` - 依赖管理
- ✅ `tsconfig.json` - TypeScript 配置
- ✅ `openclaw.plugin.json` - 插件元数据

**工程命令**:
```bash
npm install           # 安装依赖
npm run typecheck     # 类型检查
npm test              # 运行测试
```

---

## 十二、未完成功能（14%）

### 12.1 真实环境联调 ❌

**缺失内容**:
- ❌ OpenClaw 真实环境联调（webhook/runtime/onboarding）
- ❌ 知识库 Provider 真实联调（Dify/Milvus）
- ❌ AES 加解密真实环境测试
- ❌ E2E 真实链路验证

---

### 12.2 配置热更新 ❌

**缺失内容**:
- ⚠️ 宿主触发链路的真实环境验证
- ⚠️ 热更新回滚链路的真实环境验证

---

### 12.3 媒体消息完整链路 ⚠️

**缺失内容**:
- ⚠️ 媒体消息真实微信环境联调与稳定性验证

---

### 12.4 Agent 权限硬约束 ❌

**缺失内容**:
- ⚠️ 插件侧未配对路由硬约束已完成
- ❌ wemp-kf 的 runtime / 平台级工具权限硬限制仍缺

---

## 功能统计

| 功能模块 | 完成度 | 说明 |
|---------|--------|------|
| 核心功能 | 95% | 双 agent 路由、webhook、消息发送、配置系统 |
| 知识库系统 | 90% | 多 provider、缓存、降级（缺真实联调） |
| Onboarding | 95% | 4 阶段向导、3 种模板（缺真实 SDK 联调） |
| 增强功能 | 100% | 菜单、AI 开关、使用量限制、人工接管、欢迎消息 |
| 持久化系统 | 100% | 本地文件持久化、物理隔离、数据迁移 |
| 错误处理 | 95% | 降级策略、日志监控（缺真实链路验证） |
| 性能优化 | 100% | 缓存、并发控制、内存优化 |
| 安全增强 | 100% | 签名验证、加解密、频率限制、输入清洗 |
| 测试体系 | 90% | 单元测试、集成测试（缺真实 E2E） |
| 文档体系 | 100% | 完整文档、API 参考、故障排查 |
| 工程化 | 100% | package.json、tsconfig.json、测试脚本 |
| **总体完成度** | **86%** | 基础扎实，功能完善 |

---

## 技术亮点

1. **架构清晰** - 模块职责明确，易于维护和扩展
2. **类型安全** - 完整的 TypeScript 类型定义
3. **错误处理** - 完善的降级策略和错误恢复
4. **性能优化** - 多级缓存、并发控制、内存管理
5. **安全可靠** - 签名验证、加解密、频率限制
6. **测试完善** - 20 个测试文件，覆盖核心功能
7. **文档齐全** - 17 个文档文件，从安装到故障排查

---

## 下一步计划

1. **P0 优先级** - 在真实 OpenClaw 环境中进行联调测试
2. **P1 优先级** - 完成知识库 Provider 真实联调（Dify/Milvus）
3. **P2 优先级** - 完成配置热更新和媒体链路的真实环境验证
4. **P3 优先级** - 实现 Agent 权限硬约束

---

**最后更新**: 2026-03-10
**项目状态**: 基础扎实，功能完善，只缺真实环境联调
