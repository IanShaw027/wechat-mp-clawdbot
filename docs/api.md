# 模块 API 速览

## webhook
- `registerWempWebhook(account)`: 注册账号路径
- `unregisterWempWebhook(account)`: 反注册
- `handleRegisteredWebhookRequest(req, res)`: 统一入口（按路径分发）
- `handleWebhookRequest(account, req, res)`: 单账号处理

## channel gateway
- `startAccount(ctx)`: 启动账号运行态并注册 webhook
- `stopAccount(ctx)`: 显式停止账号运行态并清理 webhook / runtime 状态（兼容扩展）
- `reloadAccount(ctx)`: 账号配置重载（更新 webhook 注册、runtime 绑定与菜单同步）
- `reloadAccount(ctx)` 行为要点：
  - 当 `account.enabled=false`：自动反注册 webhook，状态更新为 disconnected
  - 当 `account.enabled=true`：重新注册 webhook，并按最新配置执行菜单同步
  - 当配置签名未变化：跳过重复 reload
  - 当新配置非法：回滚到上一个有效账号状态，并写入 `reload_rolled_back:*`

## pairing
- `requestPairing(accountId, openId, ttlMs?)`: 申请/复用配对码
- `approvePairingCode(code)`: 审批配对码
- `queryPairingSubject(accountId, openId)`: 查询配对状态
- `revokePairing(accountId, openId)`: 撤销配对
- `isPairingAllowed(allowFrom, accountId, openId)`: 鉴权判定
- `flushPairingNotificationsToExternal(limit?)`: 将配对通知队列投递到外部 endpoint（若配置）
- 配对通知外部链路：
  - 入队事件：`requested / approved / revoked`
  - 后台 pump：由 channel 定时调用 `flushPairingNotificationsToExternal`
  - 环境变量：`WEMP_PAIRING_NOTIFY_ENDPOINT`、`WEMP_PAIRING_NOTIFY_TOKEN`、`WEMP_PAIRING_NOTIFY_TIMEOUT_MS`、`WEMP_PAIRING_NOTIFY_RETRIES`

## outbound
- `sendText(account, target, text)`: 文本发送（分片）
- `sendImageByMediaId(account, target, mediaId)`: 图片发送
- `sendVoiceByMediaId(account, target, mediaId)`: 语音发送
- `sendVideoByMediaId(account, target, mediaId)`: 视频发送
- `sendFileByMediaId(account, target, mediaId)`: 文件发送

## wechat api
- `getAccessToken(account, forceRefresh?)`
- `sendCustomTextMessage(account, openId, text)`
- `sendCustomImageMessage(account, openId, mediaId)`
- `sendCustomVoiceMessage(account, openId, mediaId)`
- `sendCustomVideoMessage(account, openId, mediaId)`
- `sendCustomFileMessage(account, openId, mediaId)`
- `uploadTempMedia(account, type, content, filename?)`
- `downloadMedia(account, mediaId)`

## onboarding
- `createWempOnboarding(options?)`: 构建可挂载 onboarding handler
- `buildOnboardingPlan(input?)`: 输入合并与默认值
- `executeWempOnboarding(workspaceRoot, input?)`: 执行脚手架并返回 summary

## handoff state
- `activateHandoffState(accountId, openId, ttlMs?)`: 进入人工接管模式
- `getHandoffState(accountId, openId)`: 查询当前是否人工接管
- `clearHandoffState(accountId, openId)`: 结束人工接管并恢复 AI
- 事件入口：`handoff`、`handoff_status`、`handoff_resume`（click）与文本命令“恢复AI”
- `emitHandoffNotification(notification)`: handoff 事件入队
- `flushHandoffNotificationsToExternal(limit?)`: 将 handoff 通知/工单事件投递到外部 endpoint（若配置）
- handoff 外部链路：
  - 基础事件：`handoff_notification`
  - 工单事件：`handoff_ticket`
  - 配置优先级：`features.handoff.ticketWebhook` > `WEMP_HANDOFF_TICKET_*`

## runtime / env 覆盖
- `WEMP_RUNTIME_CHAT_TYPE`: 覆盖派发 `chatType`（`direct` 或 `group`）
- `WEMP_RUNTIME_SESSION_KEY_TEMPLATE`: 覆盖 sessionKey 模板（支持 `{agentId}` / `{channel}` / `{accountId}` / `{openId}`）
- `WEMP_REQUIRE_HTTPS`: 全局开启 webhook HTTPS 强制（也可用配置级 `requireHttps`）
