# 故障排查

## 1) 微信回调 403 Invalid signature
- 检查 `token` 与公众号后台配置是否一致
- 若启用加密模式，确认 `encodingAESKey` 正确
- 确认 URL query 中 `timestamp/nonce/signature` 被原样透传

## 1.1) 微信回调 403 HTTPS required
- 检查是否开启了任一 HTTPS 强制开关：`channels.wemp.requireHttps` / `channels.wemp.accounts.<id>.requireHttps` / `WEMP_REQUIRE_HTTPS`
- 若服务在反向代理后，确认代理传递 `x-forwarded-proto=https`
- 本地调试若需 HTTP，请临时关闭上述强制开关

## 2) 消息收到了但没有转给 agent
- 查看 `dispatchToAgent` 返回是否 `accepted=false`
- 确认 runtime 已绑定（`startAccount` 会尝试 `trySetWempRuntime`）
- 检查 `dm.policy`、`allowFrom` 与 pairing 状态

## 3) 未配对用户无法继续
- 插件会返回配对码与审批提示
- 使用提示中的 approve 命令或对应 API 完成审批
- 过期后重新触发消息会复用或生成新码

## 4) 微信接口限流
- 遇到限流错误码后会进入本地 cooldown（`rate_limited_local_cooldown`）
- 观察日志中的 `wechat_rate_limited` 事件与 `localCooldownUntil`

## 5) 菜单未生效
- 确认 `features.menu.enabled=true` 且 `items` 非空
- 启动时会自动调用菜单同步，失败会写入 `lastError`

## 6) 知识库没有命中
- `local` 模式检查 `knowledge/` 下 markdown 内容和关键词
- `external` 模式检查 provider 参数、网络连通性
- 外部失败时会回退本地（当仅有错误占位结果时）

## 7) 配置更新后没有生效（reloadAccount 相关）
- 确认宿主运行时是否触发了 `gateway.reloadAccount(ctx)`（而不只是修改了配置文件）
- 检查日志中是否出现 `account reloaded`、`reload skipped`、`reload_rolled_back:*` 或 `account disabled on reload`
- 若宿主暂不支持热重载触发，重启 channel/plugin 进程

## 8) Pairing 外部通知没有送达
- 检查 `WEMP_PAIRING_NOTIFY_ENDPOINT` 是否配置且可达
- 检查 `WEMP_PAIRING_NOTIFY_TOKEN` 是否与对端鉴权要求一致
- 检查超时/重试参数：`WEMP_PAIRING_NOTIFY_TIMEOUT_MS`、`WEMP_PAIRING_NOTIFY_RETRIES`
- 查看 `.data/pairing-notify.json` 是否持续堆积（表示队列未被成功消费）

## 9) 一直停留在人工接管模式
- 发送“恢复AI”或点击 `handoff_resume` 主动恢复
- 检查 `features.handoff.autoResumeMinutes` 是否配置过大
- 检查 `.data/handoff-state/<accountId>/<openId>.json` 中 `active/expireAt` 是否异常

## 9.1) Handoff 外部通知 / 工单 webhook 没有送达
- 检查 `WEMP_HANDOFF_NOTIFY_ENDPOINT` 或 `features.handoff.ticketWebhook.endpoint` 是否配置且可达
- 若走环境变量工单 webhook，检查 `WEMP_HANDOFF_TICKET_ENDPOINT` / `WEMP_HANDOFF_TICKET_EVENTS`
- 若走配置项工单 webhook，检查 `features.handoff.ticketWebhook.enabled/events`
- 查看 `.data/handoff-notify.json` 是否持续堆积（表示队列未被成功消费）

## 10) Runtime 派发参数不符合预期
- 检查 `WEMP_RUNTIME_CHAT_TYPE` 是否误设（仅支持 `direct` / `group`）
- 检查 `WEMP_RUNTIME_SESSION_KEY_TEMPLATE` 模板变量是否正确
- 在日志中核对最终 dispatch payload 的 `chatType` 与 `sessionKey`

## 11) 账号无法正常停止
- 若宿主支持显式停止，可检查是否调用 `gateway.stopAccount(ctx)`
- 若宿主只支持标准模式，确认 `abortSignal` 是否触发
- 检查日志中是否出现 `account stopped`
