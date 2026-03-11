# 最佳实践

## 配置
- 多账号场景保证 `webhookPath` 唯一，避免路由冲突
- 生产环境开启 `pairing` 或 `allowlist`，避免公开入口直接放开
- 将 `wemp-kf` 与 `main` 分离，保留明确升级边界

## 运行
- 先跑 `npm run typecheck`，再跑 `npm test`
- 观察结构化日志关键事件：`wechat_rate_limited`、`webhook handler failed`
- 当出现限流时，尊重本地 cooldown，避免重复压测微信接口

## 知识与回复
- 先维护本地知识库，再接外部 provider
- 对“报价/交付/投诉”统一走 handoff 规则
- 保持回复短句和可执行下一步，减少模糊建议

## 变更发布
- 变更前先更新 `docs/TODO.md` 目标状态
- 合并前至少包含一个回归测试（单元或集成）
- 发布后抽查：订阅欢迎、未配对配对码、已配对主路由、菜单同步
