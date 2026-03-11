# wemp v2

微信公众号 channel 插件设计与实现目录。

## 文档导航
- 安装与启动：`docs/install.md`
- 配置说明：`docs/config.md`
- 模块 API：`docs/api.md`
- 模板场景：`docs/templates.md`
- 知识库维护：`docs/knowledge-maintenance.md`
- 最佳实践：`docs/best-practices.md`
- 故障排查：`docs/troubleshooting.md`
- 任务看板：`docs/TODO.md`

## 目标
- channel id: `wemp`
- 客服 agent: `wemp-kf`
- 已配对路由: `main`
- 未配对路由: `wemp-kf`

## 当前完成度
- 基础配置模型
- 双 agent 路由模型
- `wemp-kf` 初始化模板与知识库目录
- 最小 webhook 文本闭环
- 最小 runtime 派发骨架
- 文本客服消息 outbound API
- 知识库 provider 结构（local / dify / milvus）
- onboarding 不覆盖已有文件，只补缺失文件
- 已具备基础自动化测试（typecheck + node test）

## 示例配置
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
      "dm": {
        "policy": "pairing",
        "allowFrom": []
      },
      "routing": {
        "pairedAgent": "main",
        "unpairedAgent": "wemp-kf"
      },
      "knowledge": {
        "mode": "hybrid",
        "providers": [
          { "type": "local", "enabled": true, "name": "local" },
          { "type": "dify", "enabled": true, "baseUrl": "https://dify.example.com", "apiKey": "***", "datasetId": "dataset_xxx" }
        ]
      }
    }
  }
}
```

## 初始化客服 agent
通过 onboarding/scaffold 生成：
- `IDENTITY.md`
- `SOUL.md`
- `AGENTS.md`
- `USER.md`
- `TOOLS.md`
- `knowledge/` 下的基础知识文件

## 当前未完成
- AES 加解密真实环境联调
- 非文本消息细分处理
- OpenClaw runtime / HTTP 真实联调
- 完整 OpenClaw runtime 适配验证
- 更完整的集成测试与 E2E
