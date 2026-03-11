# 安装与启动

## 前置条件
- Node.js 20+（当前在 Node 22 验证）
- 可访问微信公众平台 API
- OpenClaw 运行环境已能加载 channel plugin

## 本地准备
```bash
npm install
npm run typecheck
npm test
```

## 最小配置
在 OpenClaw 主配置中添加 `channels.wemp`：

```json
{
  "channels": {
    "wemp": {
      "enabled": true,
      "appId": "wx_appid",
      "appSecret": "wx_secret",
      "token": "verify_token",
      "encodingAESKey": "optional_aes_key",
      "webhookPath": "/wemp",
      "dm": { "policy": "pairing", "allowFrom": [] },
      "routing": { "pairedAgent": "main", "unpairedAgent": "wemp-kf" }
    }
  }
}
```

## 可选功能配置（handoff）
如需启用人工接管模式，可在 `features` 中增加：

```json
{
  "channels": {
    "wemp": {
      "features": {
        "handoff": {
          "enabled": true,
          "contact": "企业微信客服",
          "autoResumeMinutes": 30,
          "activeReply": "当前会话已转人工处理，请稍候。",
          "ticketWebhook": {
            "enabled": true,
            "endpoint": "https://example.com/wemp/handoff-ticket",
            "events": ["activated", "resumed"]
          }
        }
      }
    }
  }
}
```

## 运行时环境变量覆盖
- `WEMP_RUNTIME_CHAT_TYPE`: 覆盖 runtime 派发 `chatType`（默认 `direct`）
- `WEMP_RUNTIME_SESSION_KEY_TEMPLATE`: 覆盖 sessionKey 模板
- `WEMP_PAIRING_NOTIFY_ENDPOINT`: 开启 pairing 外部通知投递
- `WEMP_PAIRING_NOTIFY_TOKEN`: pairing 外部通知 Bearer token（可选）
- `WEMP_HANDOFF_NOTIFY_ENDPOINT`: 开启 handoff 外部通知投递
- `WEMP_HANDOFF_NOTIFY_TOKEN`: handoff 外部通知 Bearer token（可选）
- `WEMP_HANDOFF_TICKET_ENDPOINT`: 开启 handoff 工单 webhook
- `WEMP_HANDOFF_TICKET_TOKEN`: handoff 工单 webhook Bearer token（可选）
- `WEMP_HANDOFF_TICKET_EVENTS`: handoff 工单事件列表（如 `activated,resumed`）
- `WEMP_REQUIRE_HTTPS`: 全局启用 webhook HTTPS 强制

示例：

```bash
export WEMP_RUNTIME_CHAT_TYPE=direct
export WEMP_RUNTIME_SESSION_KEY_TEMPLATE='agent:{agentId}:{channel}:{accountId}:dm:{openId}'
export WEMP_PAIRING_NOTIFY_ENDPOINT='https://example.com/wemp/pairing-notify'
export WEMP_PAIRING_NOTIFY_TOKEN='replace_me'
export WEMP_HANDOFF_NOTIFY_ENDPOINT='https://example.com/wemp/handoff-notify'
export WEMP_HANDOFF_TICKET_ENDPOINT='https://example.com/wemp/handoff-ticket'
export WEMP_HANDOFF_TICKET_EVENTS='activated,resumed'
export WEMP_REQUIRE_HTTPS=true
```

## 关于 reloadAccount
- 插件已实现 `gateway.reloadAccount(ctx)`：用于配置变更后的账号重载
- 重载时会按最新 `enabled` 状态执行注册/反注册 webhook，并重新同步菜单
- 若配置签名未变化，会跳过重复处理
- 若新配置非法，会回滚到上一个有效账号状态
- 若宿主环境未自动触发 `reloadAccount`，可先重启对应 channel/plugin 进程作为替代

## 关于 stopAccount
- 插件额外实现了 `gateway.stopAccount(ctx)` 兼容扩展
- 它可显式停止单账号运行态并清理 webhook / runtime 状态
- 但当前已知宿主公开契约仍主要依赖 `startAccount + abortSignal`，是否会自动调用 `stopAccount` 仍需真实环境确认

## 验证清单
- 公众号服务器地址指向 OpenClaw HTTP 入口 + `webhookPath`
- 首次关注触发欢迎语
- 未配对用户触发配对码提示
- 已配对用户可路由到 `main`

## 常用命令
- 类型检查：`npm run typecheck`
- 运行测试：`npm test`
