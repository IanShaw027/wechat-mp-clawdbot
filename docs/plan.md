# wemp v2 实施计划

## 目标
构建官方风格的微信公众号 channel 插件 `wemp`，内置双 agent 路由、客服 agent 初始化能力，以及可绑定主流外部知识库的 onboarding。

## 命名
- channel: `wemp`
- 客服 agent: `wemp-kf`
- 已配对路由: `main`
- 未配对路由: `wemp-kf`

## 核心原则
1. 基础能力优先，增强能力默认关闭
2. onboarding 只初始化，不覆盖用户已有文件
3. 客服知识库允许用户自由维护
4. 支持本地知识库 + 外部知识库绑定（Milvus / Dify / 可扩展 provider）
5. 公开入口默认受限，未配对用户走 `wemp-kf`

## V1 范围（基础）
- 基础 channel 接入
- pairing + dm policy
- paired/unpaired routing
- 安装时创建 `wemp-kf`
- 初始化基础文件与知识库目录
- 三种模板：企业客服 / 内容助手 / 通用客服
- `wemp-kf` 默认受限权限
- 最小 webhook 文本闭环
- 文本 outbound API

## V1 增强
- menu（默认关闭）
- assistant-toggle（默认关闭）
- usage-limit（默认关闭）
- onboarding 时可绑定知识库 provider

## 需要补强的运行时规则
### 1. 消息分流总规则
- 普通文本 -> inbound -> routing -> agent
- 菜单/AI开关/usage 查询 -> 优先走 feature 层
- subscribe/unsubscribe/验证类 -> 系统处理

### 2. 失败与降级策略
- access_token 失败 -> 记录错误并快速失败
- 外部知识库失败 -> 降级为本地知识库 / 纯客服模式
- webhook 超时 -> 优先快速 ack
- 微信接口限流 -> 记录并降级

### 3. 持久化策略
- assistant-toggle / usage-limit / 未来 menu 状态需要本地持久化
- 使用按 accountId/openId 隔离的数据文件

### 4. 幂等/去重策略
- 基于 msgId / eventKey 做短期去重
- 防止微信重试导致重复投递

### 5. sessionKey 与上下文策略
- 默认 sessionKey: `agent:<agentId>:wemp:<accountId>:dm:<openId>`
- 配对前后默认切换 agent，因此上下文隔离

### 6. 人工接管/升级机制
- 第一版先提供联系方式/转人工规则
- 后续可扩展为跨渠道通知

### 7. 客服脚手架重入/覆盖策略
- onboarding 再次执行时：不覆盖已有文件
- 仅补缺失文件，并输出变更清单

### 8. feature 默认关闭原则
- menu / assistant-toggle / usage-limit 默认为关闭
- 需要配置显式开启

## 知识库绑定设计
### 知识来源模式
- local
- external
- hybrid

### provider 目标
- local markdown
- dify
- milvus
- 后续可扩展更多 provider

### onboarding 新增步骤
1. 选择知识来源模式
2. 选择是否绑定 Dify / Milvus
3. 填写 provider 参数
4. 写入 provider 配置（不写入知识库 markdown）

## 并行实施拆分
### Track A：项目骨架
- package/openclaw.plugin.json/README
- src/channel.ts
- src/config-schema.ts
- src/types.ts
- src/runtime.ts

### Track B：消息链路骨架
- src/api.ts
- src/crypto.ts
- src/http.ts
- src/webhook.ts
- src/inbound.ts
- src/outbound.ts

### Track C：安全与路由
- src/security.ts
- src/pairing.ts
- src/routing.ts
- src/status.ts

### Track D：onboarding + 脚手架
- src/onboarding.ts
- src/scaffold.ts
- src/templates.ts
- templates/*.md

### Track E：知识库 provider
- src/knowledge/types.ts
- src/knowledge/index.ts
- src/knowledge/local.ts
- src/knowledge/dify.ts
- src/knowledge/milvus.ts

## 当前阶段
先完成完整骨架、provider 设计和脚手架保护策略，再补真实 API 细节、持久化和联调。
