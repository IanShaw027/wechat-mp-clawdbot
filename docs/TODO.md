# wemp v2 未完成任务清单

根据 chat.md、plan.md、progress.md 和代码实现的对比分析，以下是所有未完成的任务。

**最新更新**: 已完成逐项代码核查，详见 TODO-VERIFICATION.md。
- 规划符合度：100%
- 实际完成度：86%（之前评估 73%，实际更高）
- TODO 标记准确度：95%

## 一、核心功能未完成项

### 1. Onboarding 交互流程 ⭐⭐⭐⭐⭐
**状态**: 脚手架代码已实现，但缺少完整的交互式安装向导
**优先级**: P0 - 这是最大的需求缺口，直接影响用户体验

**需求来源**: chat.md 第 348-399 行定义了 4 阶段安装流程

**缺失内容**:
- [x] 实现 4 阶段交互式向导定义（chat.md 第 348-399 行）
  - 阶段 1: 渠道接入配置（AppID/Secret/Token/AES Key/WebhookPath/dm.policy）
  - 阶段 2: 路由配置（已配对 agent/未配对 agent/客服 agent id）
  - 阶段 3: 自动创建 wemp-kf（agent 目录/基础文件/知识库目录）
  - 阶段 4: 客服人设初始化向导（选择模板/采集信息）
- [x] 实现知识库向导问题定义（chat.md 第 588-608 行）
  - 必问：品牌名称/服务对象/核心服务/转人工规则/联系方式/客服偏好
  - 可选：推荐文章/禁止话题/回复风格
- [x] 在 channel.ts 中挂载 onboarding 接口
- [x] 实现用户输入采集与验证逻辑
- [x] 把知识来源模式与 provider 参数采集纳入 onboarding 正式步骤
- [x] 完成 scaffold 执行后的变更清单与完成提示输出

**当前状态**:
- ✅ scaffold.ts 已实现文件生成逻辑
- ✅ templates.ts 已实现模板渲染
- ✅ onboarding.ts 已有基础结构
- ✅ onboarding 支持默认计划、答案 patch、provider 绑定、scaffold 调用
- ✅ channel.ts 已挂载 onboarding 兼容接口（`createWempOnboarding`）
- ✅ onboarding 已补齐 4 阶段 `stages` 与必问/可选问题清单
- ⚠️ 仍需与 OpenClaw 官方 SDK 的真实 onboarding 回调形态联调

**阻塞原因**: 缺少 OpenClaw plugin SDK 的官方 onboarding 类型与联调环境

---

### 2. 知识库 Provider 实现
**状态**: 已有 HTTP 检索骨架和基础返回映射，但缺少真实联调与降级完善

**Dify Provider** (src/knowledge/dify.ts):
- [x] 已有基础 Dify HTTP 调用与结果映射
- [ ] 校验真实 Dify API 兼容性
- [x] 完善 API 错误处理与降级
- [x] 添加超时与重试机制

**Milvus Provider** (src/knowledge/milvus.ts):
- [x] 已有基础 Milvus HTTP 检索与结果映射
- [ ] 校验真实 Milvus API 兼容性
- [x] 处理连接失败与降级
- [x] 实现结果排序与过滤

**Local Provider** (src/knowledge/local.ts):
- [x] 已实现本地 markdown 文件扫描
- [x] 已实现简单文本匹配检索（关键词计分）
- [x] 支持知识库目录动态加载（支持 config.path/rootDir/directory）

**当前状态**:
- ✅ knowledge/index.ts 统一入口已完成
- ✅ knowledge/types.ts 类型定义已完成
- ✅ Dify / Milvus 已有 HTTP 检索骨架
- ✅ Local provider 已从 placeholder 升级为真实本地检索
- ✅ `knowledge/index.ts` 已增加外部失败自动回退本地
- ✅ Milvus 已支持 `topK`、`minScore`、空内容过滤与 score 优先排序
- ✅ `knowledge/index.ts` 已增加 TTL 查询缓存与容量裁剪
- ⚠️ 三类 provider 仍缺少真实环境联调验证

---

### 3. 增强功能真实链路接入

**Menu 功能** (src/features/menu.ts):
- [x] 已实现 syncWechatMenu API 调用
- [x] 在 channel.ts gateway.startAccount 中按配置调用 syncWechatMenu
- [x] 实现菜单查询 API
- [x] 实现菜单删除 API
- [x] 添加菜单同步失败的错误处理

**Assistant Toggle** (src/features/assistant-toggle.ts):
- [x] 已实现基于 `.data/assistant-toggle/<accountId>.json` 的文件持久化（兼容旧文件迁移）
- [x] 已在 webhook / inbound 事件流中接入 assistant_on/assistant_off 点击动作
- [x] 添加状态查询接口（`assistant_status` 事件）

**Usage Limit** (src/features/usage-limit.ts):
- [x] 已实现基于 `.data/usage-limit/<accountId>.json` 的文件持久化（兼容旧文件迁移）
- [x] 已实现按日重置逻辑
- [x] 添加使用量查询接口（`usage_status` 事件）
- [x] 优化 Token 计数（UTF-8 字节估算 + CJK 修正）

**当前状态**:
- ✅ 配置解析已完成
- ✅ 基础逻辑已接入 inbound.ts
- ✅ assistant-toggle / usage-limit 已有本地文件持久化
- ✅ usage token 计数已从文本长度升级为估算模型
- ✅ Menu API 已在 startAccount 中接入调用
- ❌ 真实链路未完全联调

---

### 4. 媒体消息处理
**状态**: 文本链路完整，媒体链路已补齐基础处理

**缺失内容**:
- [x] 图片消息下载与处理
- [x] 语音消息下载与转文字
- [x] 视频消息处理
- [x] 文件消息处理
- [x] 位置消息处理
- [x] 链接消息处理
- [x] 媒体下载能力接入 `api.ts`
- [x] 素材上传能力接入 `api.ts`
- [x] 媒体消息的 outbound 发送（已支持 `sendImageByMediaId` / `sendVoiceByMediaId` / `sendVideoByMediaId` / `sendFileByMediaId`）

**当前状态**:
- ✅ inbound.ts 已支持 image/voice/location/link/video/file 的解析与标准化文本处理
- ✅ webhook 已支持 image/voice 的媒体下载摘要增强与失败降级
- ✅ 语音已支持独立 ASR 可选转写（`voiceTranscribe.endpoint` 或 `WEMP_VOICE_TRANSCRIBE_ENDPOINT`）
- ✅ outbound 已支持文本 + 图片/语音/视频/文件（media_id）
- ⚠️ 仍需在真实微信环境验证媒体 outbound 成功率与失败重试表现

---

### 5. AES 加解密完整测试
**状态**: 代码已实现，但未经过真实环境验证

**需要验证**:
- [ ] 微信服务器推送的加密消息解密
- [ ] 被动回复消息的加密
- [ ] 签名验证在加密模式下的正确性
- [ ] 边界情况处理（空消息、超长消息等）

**当前状态**:
- ✅ crypto.ts 已实现加解密函数
- ✅ webhook.ts 已集成加解密逻辑
- ✅ 基础代码链路已完成
- ✅ 已补充自动化单元测试覆盖加解密与签名验证
- ❌ 缺少真实环境测试与边界验证

---

## 二、运行时集成未完成项

### 6. OpenClaw Runtime 完整适配
**状态**: 基础派发已实现，但缺少完整验证

**缺失内容**:
- [ ] 验证 dispatchInbound 的真实调用
- [ ] 验证 sessionKey 格式是否符合 OpenClaw 规范
- [ ] 验证 chatType: "direct" 的正确性
- [x] 实现 runtime 错误处理与降级（本地快照层）
- [x] 实现 runtime 状态监控（本地快照层）
- [ ] 校验 `status` 快照字段在真实 runtime 中的更新时机

**当前状态**:
- ✅ runtime.ts 已实现 dispatchToAgent
- ✅ status.ts 已支持本地快照合并与 inbound/outbound/error 打点
- ✅ channel.ts buildAccountSnapshot 已合并本地 runtime 快照
- ❌ 未在真实 OpenClaw 环境中验证

---

### 7. Pairing 系统集成
**状态**: 基础逻辑已实现，但缺少与 OpenClaw pairing runtime 的对接

**缺失内容**:
- [x] 实现 request pairing 调用（本地 pending code）
- [x] 实现 approve notify 调用（本地通知队列）
- [x] 实现 paired state 查询
- [x] 处理 pairing 失败与超时（pending code TTL）
- [x] 实现 pairing 状态变更通知（approved/revoked 事件）

**当前状态**:
- ✅ pairing.ts 已实现基础工具函数
- ✅ security.ts 已实现 dm policy 判断
- ✅ 已支持 `allowFrom` + 本地审批记录双通道判定
- ✅ webhook 未配对分支已接入配对码引导与 approve hint
- ✅ pairing.ts 已支持通知队列消费（`consumePairingNotifications`）
- ✅ 已实现 pairing 外部通知链路（队列 + 定时 pump + endpoint 重试投递）
- ⚠️ 缺少与真实 OpenClaw pairing runtime/API 的联调验证

---

## 三、持久化与状态管理

### 8. 本地持久化实现
**状态**: 基础 JSON 文件持久化与 accountId/openId 物理隔离已实现

**需要实现**:
- [x] Assistant toggle 状态持久化
- [x] Usage limit 数据持久化（按日、按用户）
- [x] Access token 缓存持久化（可选）
- [x] 消息去重记录持久化（可选）
- [x] 进一步实现数据文件按 accountId/openId 物理隔离

**当前状态**:
- ✅ storage.ts 已实现 `.data` 目录下的 JSON 读写
- ✅ assistant-toggle / usage-limit 已接入 storage
- ✅ access_token 已支持 `.data/access-token-cache.json` 持久化与重启后复用
- ✅ assistant-toggle / usage-limit 已升级为 `.data/<feature>/<accountId>/<openId>.json` 物理隔离并兼容旧数据迁移

---

### 9. 消息去重持久化
**状态**: 内存+文件持久化去重已实现，并补充了基础自动化验证

**需要改进**:
- [x] 实现去重记录的持久化存储
- [x] 实现过期清理机制（如 5 分钟后自动清理）
- [x] 优化内存占用（超过阈值自动裁剪）

**当前状态**:
- ✅ dedup.ts 已实现内存去重 + `.data/dedup.json` 持久化
- ✅ 已实现过期清理并新增持久化基础测试
- ✅ 已增加大 Map 裁剪策略（`MAX_KEYS/TRIM_COUNT`）

---

## 四、错误处理与降级

### 10. 失败与降级策略
**状态**: 部分实现，但不完整

**需要实现** (plan.md 第 42-46 行):
- [x] access_token 失败 → 记录错误并快速失败
- [x] 外部知识库失败 → 降级为本地知识库/纯客服模式
- [x] webhook 超时 → 优先快速 ack（已添加 inbound/dispatch 超时保护）
- [x] 微信接口限流 → 记录并降级（本地 cooldown）
- [x] 实现统一的错误分类与日志记录（基础版）

**当前状态**:
- ✅ api.ts 已实现 token 过期重试
- ✅ api.ts 已对 access_token 异常做快速失败与告警日志
- ✅ webhook 超时场景当前以被动回复 / success ack 为主
- ✅ webhook 已增加 inbound/dispatch 超时回退回复
- ✅ 已实现外部知识库失败回退本地
- ✅ 已实现微信限流检测与本地降级（`rate_limited_local_cooldown`）
- ✅ 已在 webhook/outbound/runtime 路径接入统一错误分类字段

---

### 11. 日志与监控
**状态**: 已升级结构化日志基础能力并接入 OpenClaw 日志桥接

**需要实现**:
- [x] 实现结构化日志输出
- [x] 记录关键事件（webhook 接收、消息派发、API 调用）
- [x] 记录错误与异常
- [x] 实现日志级别控制
- [x] 与 OpenClaw 日志系统集成

**当前状态**:
- ✅ log.ts 已支持 JSON 结构化输出与 level 过滤（`WEMP_LOG_LEVEL`）
- ✅ log.ts 已支持敏感字段脱敏（token/secret/apiKey 等）
- ✅ log.ts 已支持按 accountId 桥接到 OpenClaw `ctx.log`
- ✅ webhook/api/outbound 已接入关键告警日志
- ⚠️ 已完成基础桥接，仍可继续深化平台侧监控整合

---

## 五、测试与文档

### 12. 自动化测试
**状态**: 单元测试覆盖已明显提升，集成与 E2E 仍需继续补齐

**需要添加**:
- [x] 单元测试
  - [x] config 解析测试
  - [x] crypto 加解密测试
  - [x] routing 逻辑测试
  - [x] inbound 消息解析测试
  - [x] runtime 派发行为测试
- [x] 集成测试
  - [x] webhook 完整流程测试
  - [x] 知识库 provider 测试（降级回退场景）
  - [x] 增强功能测试
- [x] E2E 测试（本地模拟）
  - [x] 真实微信消息模拟
  - [x] 配对流程测试

**当前状态**:
- ✅ 已新增自动化测试与测试脚本（config / routing / crypto / onboarding / pairing / dedup / api-rate-limit / inbound / knowledge / runtime / outbound / log / templates / assistant-toggle-isolation / feature-storage / webhook.integration / webhook-media.integration / webhook-media-e2e / e2e-local）
- ⚠️ E2E 为本地模拟，仍缺真实环境联调测试

---

### 13. 文档完善
**状态**: README 基础，缺少详细文档

**需要补充**:
- [x] 完整的安装指南
- [x] 配置项详细说明
- [x] 三种模板的使用场景说明
- [x] 知识库维护指南
- [x] 故障排查指南
- [x] API 参考文档
- [x] 最佳实践文档

**当前状态**:
- ✅ README.md 有基础说明
- ✅ docs/plan.md 有设计文档
- ✅ docs/progress.md / docs/review-notes.md / docs/chat.md 已沉淀设计与进展
- ✅ docs/install.md / docs/config.md / docs/api.md / docs/troubleshooting.md 已补齐
- ✅ docs/templates.md / docs/knowledge-maintenance.md / docs/best-practices.md 已补齐

---

## 六、Webhook 与 HTTP 服务集成

### 14. Webhook 注册与路由
**状态**: 基础注册已实现，但缺少与 OpenClaw HTTP 服务的集成

**缺失内容**:
- [x] 提供 webhook 接入点（`gateway.handleRequest` 适配）
- [x] 实现 webhook 路由分发（多账号支持）
- [x] 实现 webhook 请求的统一入口
- [x] 添加 webhook 请求日志与监控
- [x] 处理 webhook 并发请求

**当前状态**:
- ✅ webhook.ts 已实现 registerWempWebhook 和 handleWebhookRequest
- ✅ channel.ts gateway.startAccount 中调用了 registerWempWebhook
- ✅ webhook.ts 已新增 `handleRegisteredWebhookRequest` 与路径注册表
- ✅ channel.ts 已增加 `gateway.handleRequest` 透传到 webhook 统一入口
- ✅ 入口异常已添加 try/catch 与错误日志
- ✅ 已增加入口请求结构化日志与每账号并发上限保护
- ❌ 不清楚 webhook 如何真正接收 HTTP 请求
- ❌ 缺少与 OpenClaw HTTP 服务的集成文档

---

## 七、脚手架与模板补遗

### 15. Runtime 初始化与生命周期
**状态**: 已覆盖 start/stop/reload 主要路径，但宿主初始化/热重载触发仍待真实环境验证

**缺失内容**:
- [x] 确认 setWempRuntime 何时被调用
- [ ] 确认 plugin 初始化流程
- [ ] 实现 plugin 启动时的初始化逻辑
- [x] 实现 plugin 停止时的清理逻辑
- [x] 处理 runtime 重新加载
- [x] 提供显式 `stopAccount` 兼容扩展

**当前状态**:
- ✅ runtime.ts 已实现 setWempRuntime 和 getWempRuntime
- ✅ channel.ts startAccount 已尝试从上下文绑定 runtime（`trySetWempRuntime`）
- ✅ abort 时已执行 webhook 反注册与 runtime 断连状态更新
- ✅ 最后一个账号停止时会清理 runtime（`clearWempRuntime`）
- ✅ `gateway.stopAccount` 已补齐显式停止路径
- ⚠️ 宿主公开契约仍主要依赖 `startAccount + abortSignal`，plugin 初始化流程仍待平台侧验证

---

### 16. 配置热更新支持
**状态**: 已实现 `reloadAccount` 入口与核心重载路径，真实环境触发链路待验证

**缺失内容**:
- [x] 实现配置变更检测
- [x] 实现账号配置热更新入口（`reloadAccount`）
- [x] 实现 webhook 路径变更处理（同 accountId 旧 path 自动反注册）
- [x] 实现 menu 配置变更后的自动同步
- [x] 处理配置更新失败的回滚

**当前状态**:
- ✅ channel.ts 中定义了 reload: { configPrefixes: ["channels.wemp"] }
- ✅ `gateway.reloadAccount` 已实现（支持 runtime 重新绑定、webhook 重注册、menu 重同步）
- ✅ webhook 注册时已处理同账号路径切换
- ✅ 已支持账号禁用态重载（`enabled=false` 时自动反注册 webhook 并更新状态）
- ✅ 同签名重载会跳过重复处理
- ✅ 非法重载配置会回滚到上一个有效账号状态（`reload_rolled_back:*`）
- ⚠️ 尚不清楚目标运行环境如何触发 `reloadAccount`

---

### 17. 消息队列与异步处理
**状态**: 已补充 outbound 队列与重试，知识库查询已支持超时异步降级

**可能需要考虑**:
- [x] 长时间知识库查询的异步处理
- [x] 批量消息发送的队列管理
- [x] 失败消息的重试机制
- [x] 消息处理超时控制

**当前状态**:
- ✅ webhook inbound/dispatch 已有超时保护与回退回复
- ✅ inbound 已对知识库查询启用非阻塞超时降级（`WEMP_KNOWLEDGE_SYNC_TIMEOUT_MS`）
- ✅ outbound 已支持按 accountId+target 串行队列
- ✅ outbound 已支持可配置有限重试

**当前状态**:
- ✅ webhook 处理是同步的，快速响应微信服务器
- ✅ outbound 已有消息队列机制
- ⚠️ 长时间知识库查询已支持超时降级，仍未接入独立后台任务队列

---

### 18. 补齐可选知识库模板
**状态**: 可选知识库模板与生成策略说明已补齐

**缺失内容**:
- [x] 补齐 `knowledge/cases.md`
- [x] 补齐 `knowledge/pricing.md`
- [x] 补齐 `knowledge/policies.md`
- [x] 明确这些文件是默认创建还是按模板条件创建

**当前状态**:
- ✅ 已生成 `company.md / products.md / faq.md / contact.md / escalation.md / articles.md`
- ✅ `cases.md / pricing.md / policies.md` 已进入脚手架输出
- ✅ `docs/templates.md` 已明确“默认创建 + 不覆盖已有文件”的策略

---

### 15. 客服 agent 权限硬约束
**状态**: 插件侧未配对路由硬约束已实现，但 runtime / 平台级工具权限硬限制仍缺

**缺失内容**:
- [ ] 确认 `wemp-kf` 的受限权限是否有 runtime / 平台级落点
- [ ] 若支持硬配置，将允许/禁止工具集真正落地
- [ ] 避免仅靠 scaffold 生成的 `AGENTS.md` 文本约束

**当前状态**:
- ✅ `templates.ts` 已把权限边界写入生成的 `AGENTS.md`
- ✅ 插件侧已新增 `features.routeGuard.enabled + unpairedAllowedAgents`，未配对路由会被强制收敛到白名单
- ❌ 仓库内仍未看到 runtime / 平台级“工具权限硬限制”配置

---

### 16. 工程化基础文件
**状态**: 已补齐基础工程文件并可执行 typecheck/test

**缺失内容**:
- [x] 补齐 `package.json`
- [x] 补齐 `tsconfig.json`
- [x] 明确构建、类型检查、测试命令

**当前状态**:
- ✅ `openclaw.plugin.json` 已存在
- ✅ `README.md` 已存在
- ✅ 根目录已补齐 `package.json` 和 `tsconfig.json`
- ✅ 已可执行 `npm run typecheck` 与 `npm test`
- ✅ 已补齐 install/config/api/troubleshooting 等使用文档

---

## 六、优化与增强

### 14. 性能优化
**需要考虑**:
- [x] Access token 缓存优化
- [x] 知识库查询缓存
- [x] 消息去重性能优化
- [x] 并发请求处理优化

**当前状态**:
- ✅ dedup 已支持过期清理 + 大 Map 裁剪
- ✅ webhook 已支持每账号并发上限与超时回退

---

### 15. 安全增强
**需要考虑**:
- [x] 请求频率限制（防止恶意请求）
- [x] 输入验证与清洗
- [x] 敏感信息脱敏
- [x] HTTPS 强制使用

**当前状态**:
- ✅ webhook 已增加按 accountId+openId 的窗口限频保护
- ✅ inbound 已增加控制字符清理与消息长度上限
- ✅ 结构化日志已增加敏感字段脱敏
- ✅ webhook 已支持 `WEMP_REQUIRE_HTTPS` 可选强制策略（支持 `x-forwarded-proto=https`）

---

### 16. 人工接管升级
**状态**: 已实现人工接管状态管理、外部通知与工单 webhook 集成

**未来可扩展** (plan.md 第 60-62 行):
- [x] 跨渠道通知人工客服（外部 webhook / queue）
- [x] 工单系统集成（ticket webhook）
- [x] 人工接管状态管理（`activate/get/clear` + 持久化）
- [x] 人工回复后自动恢复 AI 模式（TTL 自动恢复 + `handoff_resume`/“恢复AI”）

**当前状态**:
- ✅ 已支持 `handoff` / `handoff_status` / `handoff_resume` 事件
- ✅ 已支持会话级人工接管拦截与剩余时间提示
- ✅ 已支持 `handoff_notification` 外部通知队列与后台 pump
- ✅ 已支持 `handoff.ticketWebhook` / `WEMP_HANDOFF_TICKET_*` 工单 webhook 集成
- ⚠️ 真实工单系统兼容性仍待目标环境验证

---

## 七、模板内容完善

### 17. 三种模板的详细内容
**状态**: 模板内容已升级为场景化话术与流程指引

**需要完善** (chat.md 第 1005-1042 行):
- [x] 企业客服模板
  - 更专业的人设描述
  - 业务咨询场景的标准话术
  - 意向识别与转化引导
- [x] 内容助手模板
  - 内容推荐的标准流程
  - 概念解释的话术模板
  - 文章导读的引导方式
- [x] 通用客服模板
  - 中性安全的人设
  - 清晰的边界说明
  - 灵活的扩展空间

**当前状态**:
- ✅ 三种模板已补齐差异化流程（enterprise/content/general）
- ✅ 已增加意向识别、风险边界与转人工话术模板

---

### 18. 知识库模板内容
**状态**: 已从占位符升级为结构化模板

**需要完善**:
- [x] company.md 的详细模板
- [x] products.md 的结构化模板
- [x] faq.md 的问答对模板
- [x] contact.md 的联系方式格式
- [x] escalation.md 的转人工规则模板
- [x] articles.md 的文章推荐格式

**当前状态**:
- ✅ 文件会被创建
- ✅ 内容已包含结构字段、话术模板和维护规则

---

## 八、配置增强

### 19. 多账号支持完善
**状态**: 配置解析与运行时重载管理已基本可用，真实环境触发链路待验证

**需要添加**:
- [x] 账号列表查询
- [x] 账号状态监控
- [x] 账号动态启用/禁用（通过 `startAccount` / `reloadAccount` / `stopAccount` 处理）
- [x] 账号配置热更新入口（`reloadAccount`）

**当前状态**:
- ✅ config.ts 已支持多账号解析
- ✅ `config.listAccountIds` 已支持账号枚举
- ✅ status 快照已支持多账号运行状态
- ✅ channel.ts 已支持账号级启动 / 重载 / 停止 / 禁用态卸载
- ⚠️ 仍需在真实环境验证重载触发与回滚链路

---

### 25. 配置验证
**状态**: 运行时验证、schema 执行与友好错误聚合已补齐

**需要添加**:
- [x] 实现配置加载时的 schema 验证
- [x] 必填字段验证（appId/appSecret/token）
- [x] 字段格式验证（如 webhookPath 格式）
- [x] 字段关联验证（如启用 AES 时校验 encodingAESKey 长度）
- [x] 配置冲突检测（如多账号 webhookPath 冲突）
- [x] 提供友好的配置错误提示

**当前状态**:
- ✅ config-schema.ts 已定义完整的 JSON Schema
- ✅ schema 包含所有字段定义和类型约束
- ✅ config.ts 已新增运行时验证函数（account/channel）
- ✅ config.ts 已接入 AJV runtime schema 校验并聚合错误提示
- ✅ channel.startAccount 已在配置非法时快速失败并写入 lastError
- ✅ 校验错误已补充 `accountId/field/fix` 等可执行修复提示
- ✅ 已接入统一 JSON Schema 运行时验证器

---

## 优先级建议

### P0 - 必须完成才能上线
1. ✅ 基础 webhook 文本闭环（已完成）
2. ✅ 配对与路由逻辑（已完成）
3. ✅ 持久化存储基础实现（已完成）
4. ⚠️ Webhook 与 OpenClaw HTTP 服务集成（已接入 `gateway.handleRequest`，仍需真实环境验证）
5. ⚠️ Runtime 初始化与生命周期（start/stop/reload 已覆盖，plugin 初始化仍待验证）
6. ⚠️ Onboarding 交互流程（4 阶段向导已完成，仍需真实 SDK 回调形态联调）
7. ❌ OpenClaw Runtime 完整适配（第 6 项）
8. ❌ AES 加解密真实环境测试（第 5 项）

### P1 - 重要但可延后
9. ❌ 知识库 Provider 真实联调（Dify/Milvus）
10. ✅ Menu 功能在 startAccount 中调用（第 3 项）
11. ⚠️ 配置热更新支持（第 16 项，`reloadAccount` 已实现，触发链路待验证）
12. ⚠️ 错误处理与降级（核心路径已覆盖，仍缺真实链路验证）
13. ⚠️ 自动化测试（单元/部分集成已覆盖，仍缺 E2E）

### P2 - 可选增强
14. ⚠️ 媒体消息处理（第 4 项，基础能力已完成，真实链路联调待补）
15. ⚠️ 消息队列与异步处理（第 17 项，队列/重试已完成，独立后台队列待补）
16. ⚠️ 日志与监控完善（结构化日志+脱敏+OpenClaw 日志桥接已完成，仍可继续深化平台监控整合）
17. ✅ 文档完善（第 13 项，主要文档已补齐）
18. ✅ 模板内容完善（第 17-18 项，已升级为结构化模板）
19. ✅ 工程化基础文件（第 16 项）

### P3 - 未来优化
20. ⚠️ 性能优化（token/knowledge cache、dedup 裁剪、并发保护已做，仍可继续优化）
21. ✅ 安全增强（限频、输入清洗、日志脱敏、HTTPS 强制策略已落地）
22. ⚠️ 人工接管升级（通知/工单 webhook 已完成，真实工单系统兼容性待补）
23. ⚠️ 配置增强（验证体系已完成，热更新触发链路待实机验证）

---

## 总结

**已完成**: 约 86%
- ✅ 项目骨架与基础架构
- ✅ 配置解析与类型定义（含完整 JSON Schema）
- ✅ 基础消息链路（文本 + 限频/超时/输入清洗）
- ✅ 配对与路由逻辑
- ✅ Onboarding 4 阶段向导与脚手架输出
- ✅ 增强功能与持久化（menu/toggle/usage-limit）
- ✅ runtime 生命周期增强（reload 回滚、stopAccount）
- ✅ handoff 外部通知与工单 webhook
- ✅ 知识库能力（本地检索、外部降级、结果过滤/排序、查询缓存）
- ✅ 测试体系扩展（unit + integration）
- ✅ 文档与模板内容完善

**未完成**: 约 14%
- ❌ OpenClaw 真实环境联调（webhook/runtime/onboarding）
- ❌ 知识库 Provider 真实联调
- ⚠️ 媒体消息链路真实联调（代码能力已完成）
- ⚠️ 配置热更新与运行时管理真实联调（`reloadAccount` 已实现）
- ⚠️ 消息队列与异步处理深化（独立后台任务队列未接入）
- ❌ E2E 与真实链路验证

**关键阻塞点**:
1. **缺少真实 OpenClaw 联调环境**：`dispatchInbound/sessionKey/chatType` 与 webhook 入口仍待实机验证
2. **配置热更新机制不明确**：`reload.configPrefixes` 已声明，但缺少可验证触发链路
3. **外部依赖实测缺失**：Dify/Milvus API 兼容性尚未实测
4. **媒体链路实机验证不足**：基础收发能力已实现，但真实微信链路与稳定性验证仍缺

**建议下一步**:
1. 在真实 OpenClaw 环境执行 webhook/runtime/onboarding 联调并回填结果
2. 在真实微信环境完成媒体链路验证（图片/语音/视频/文件）
3. 验证 `reloadAccount` 在目标运行环境中的触发与回滚策略
4. 增加 E2E 用例（真实微信消息模拟 + pairing 全链路）
