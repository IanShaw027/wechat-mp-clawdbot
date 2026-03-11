# 配置说明

## 顶层结构
- `channels.wemp.enabled`: 是否启用
- `channels.wemp.requireHttps`: 通道级 HTTPS 强制开关
- `channels.wemp.defaultAccount`: 默认账号 ID（多账号模式）
- `channels.wemp.accounts`: 多账号配置对象

## 账号字段
- `appId` / `appSecret` / `token`: 微信校验与 API 调用必需
- `encodingAESKey`: 启用安全模式时需要
- `webhookPath`: 账号 webhook 路径，默认 `/wemp`
- `requireHttps`: 账号级 HTTPS 强制开关
- `dm.policy`: `pairing | allowlist | open | disabled`
- `dm.allowFrom`: 放行列表（支持 `openId` 或 `accountId:openId`）
- `routing.pairedAgent`: 已配对路由，默认 `main`
- `routing.unpairedAgent`: 未配对路由，默认 `wemp-kf`

## HTTPS 强制策略
- webhook 会在以下任一条件满足时拒绝 HTTP 请求（返回 `403 HTTPS required`）：
- `channels.wemp.requireHttps = true`（通道级）
- `channels.wemp.accounts.<id>.requireHttps = true`（账号级）
- 环境变量 `WEMP_REQUIRE_HTTPS` 为 truthy（`1/true/yes/on`）

## knowledge
- `knowledge.mode`: `local | external | hybrid`
- `knowledge.providers`: 支持 `local` / `dify` / `milvus`

### local provider
- 可选：`path` / `rootDir` / `directory`

### dify provider
- `baseUrl`
- `apiKey`
- 可选：`datasetId`、`timeoutMs`、`retries`

### milvus provider
- `endpoint`
- `collection`
- 可选：`token`、`database`、`timeoutMs`、`retries`

## features
- `menu.enabled` / `menu.items`
- `assistantToggle.enabled` / `assistantToggle.defaultEnabled`
- `usageLimit.enabled` / `dailyMessages` / `dailyTokens` / `exemptPaired`
- `handoff.enabled` / `contact` / `message` / `autoResumeMinutes` / `activeReply`
- `handoff.ticketWebhook.enabled` / `endpoint` / `token` / `events`
- `welcome.enabled` / `subscribeText`

### handoff 补充说明
- 用户点击 `handoff` 后会进入人工接管状态，AI 自动回复会临时暂停
- 到达 `autoResumeMinutes` 后自动恢复 AI
- 用户也可发送 `恢复AI`（或点击 `handoff_resume`）立即恢复
- 若配置 `handoff.ticketWebhook`，`activated/resumed` 事件会额外投递到工单 webhook
- `handoff.ticketWebhook.events` 支持 `activated` / `resumed`，默认仅 `activated`

## Pairing 外部通知（环境变量）
- `WEMP_PAIRING_NOTIFY_ENDPOINT`: 配对通知投递地址（接收 requested/approved/revoked 事件）
- `WEMP_PAIRING_NOTIFY_TOKEN`: 可选 Bearer token
- `WEMP_PAIRING_NOTIFY_RETRIES`: 请求失败重试次数（默认 1）
- `WEMP_PAIRING_NOTIFY_TIMEOUT_MS`: 单次请求超时（默认 3000ms）
- `WEMP_PAIRING_NOTIFY_PUMP_INTERVAL_MS`: 后台队列投递间隔（默认 5000ms）

## Handoff 外部通知（环境变量）
- `WEMP_HANDOFF_NOTIFY_ENDPOINT`: handoff 通知投递地址（接收 `handoff_notification` 事件）
- `WEMP_HANDOFF_NOTIFY_TOKEN`: 可选 Bearer token
- `WEMP_HANDOFF_NOTIFY_RETRIES`: 请求失败重试次数（默认 1）
- `WEMP_HANDOFF_NOTIFY_TIMEOUT_MS`: 单次请求超时（默认 3000ms）
- `WEMP_HANDOFF_NOTIFY_PUMP_INTERVAL_MS`: 后台队列投递间隔（默认 5000ms）

## Handoff 工单 webhook（环境变量）
- `WEMP_HANDOFF_TICKET_ENDPOINT`: 工单 webhook 地址（接收 `handoff_ticket` 事件）
- `WEMP_HANDOFF_TICKET_TOKEN`: 可选 Bearer token
- `WEMP_HANDOFF_TICKET_EVENTS`: 逗号分隔事件列表，支持 `activated,resumed`

## Runtime 派发（环境变量）
- `WEMP_RUNTIME_CHAT_TYPE`: `direct`（默认）或 `group`
- `WEMP_RUNTIME_SESSION_KEY_TEMPLATE`: sessionKey 模板，支持 `{agentId}`、`{channel}`、`{accountId}`、`{openId}`
