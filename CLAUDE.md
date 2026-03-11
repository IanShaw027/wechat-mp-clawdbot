# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

wemp v2 是一个官方风格的微信公众号 channel 插件，用于 OpenClaw 平台。核心特性：
- 双 agent 路由模型（已配对用户 → main agent，未配对用户 → wemp-kf 客服 agent）
- 支持多账号配置
- 内置客服 agent 脚手架生成
- 混合知识库支持（local/dify/milvus）
- 可选增强功能（菜单、AI 开关、使用限制）

## 核心架构

### 消息流转链路
1. **webhook.ts** - 接收微信服务器推送，处理签名验证、AES 解密、消息去重
2. **inbound.ts** - 解析消息内容，处理事件（订阅/取消订阅/菜单点击），规范化文本
3. **routing.ts** - 根据配对状态路由到不同 agent（paired → main, unpaired → wemp-kf）
4. **runtime.ts** - 调用 OpenClaw runtime 的 dispatchInbound 派发消息到目标 agent
5. **outbound.ts** - 通过微信客服消息 API 发送回复

### 配置解析流程
- **config.ts** - 解析多账号配置，合并默认值，生成 ResolvedWempAccount
- **config-schema.ts** - 定义配置 schema
- **types.ts** - 所有类型定义

### 安全与配对
- **security.ts** - DM policy 解析（pairing/allowlist/open/disabled）
- **pairing.ts** - 配对逻辑，生成配对审批命令
- **crypto.ts** - 微信签名验证、AES 加解密

### 知识库系统
- **knowledge/index.ts** - 统一知识库搜索入口，支持 local/external/hybrid 模式
- **knowledge/local.ts** - 本地 markdown 知识库
- **knowledge/dify.ts** - Dify 知识库集成
- **knowledge/milvus.ts** - Milvus 向量数据库集成

### Onboarding 与脚手架
- **onboarding.ts** - 初始化流程编排，生成客服 agent 配置
- **scaffold.ts** - 生成 agent 文件（IDENTITY.md, SOUL.md, AGENTS.md, USER.md, TOOLS.md, knowledge/）
- **templates.ts** - 三种模板（enterprise/content/general）的内容生成

### 增强功能（默认关闭）
- **features/menu.ts** - 自定义菜单
- **features/assistant-toggle.ts** - AI 助手开关
- **features/usage-limit.ts** - 使用次数限制

## 开发规范

### TypeScript 编译
此项目使用 TypeScript，但没有 package.json 和构建脚本。假设由上层 OpenClaw 项目统一编译。

### 模块导入
所有导入使用 `.js` 扩展名（ESM 规范），例如：
```typescript
import { foo } from "./bar.js";
```

### 配置结构
配置位于 OpenClaw 主配置的 `channels.wemp` 节点下：
```json
{
  "channels": {
    "wemp": {
      "enabled": true,
      "appId": "wx_xxx",
      "appSecret": "secret",
      "token": "token",
      "webhookPath": "/wemp",
      "routing": {
        "pairedAgent": "main",
        "unpairedAgent": "wemp-kf"
      }
    }
  }
}
```

### 多账号支持
- 单账号：直接在 `channels.wemp` 下配置
- 多账号：使用 `channels.wemp.accounts` 对象，key 为 accountId
- 默认账号 ID：`default`

### 消息去重
使用 **dedup.ts** 基于 msgId/event/eventKey/createTime 生成去重 key，防止微信重试导致重复处理。

### SessionKey 规则
格式：`agent:<agentId>:wemp:<accountId>:dm:<openId>`
配对前后切换 agent 会导致上下文隔离。

### Onboarding 保护策略
再次执行 onboarding 时：
- 不覆盖已存在的文件
- 仅补充缺失文件
- 返回 created/skipped 清单

### 增强功能默认关闭
menu/assistantToggle/usageLimit 需要在配置中显式 `enabled: true` 才会生效。

## 关键约定

### DM Policy
- `pairing` - 需要配对才能使用主 agent
- `allowlist` - 仅允许 allowFrom 列表中的用户
- `open` - 所有用户直接路由到主 agent
- `disabled` - 禁用 DM

### 知识库模式
- `local` - 仅使用本地 markdown
- `external` - 仅使用外部 provider（dify/milvus）
- `hybrid` - 混合使用本地和外部

### 模板类型
- `enterprise` - 企业客服
- `content` - 内容助手
- `general` - 通用客服

## 文件组织

```
src/
├── channel.ts          # ChannelPlugin 入口
├── webhook.ts          # Webhook 处理
├── inbound.ts          # 入站消息处理
├── outbound.ts         # 出站消息发送
├── runtime.ts          # OpenClaw runtime 集成
├── routing.ts          # Agent 路由
├── config.ts           # 配置解析
├── config-schema.ts    # 配置 schema
├── types.ts            # 类型定义
├── security.ts         # 安全策略
├── pairing.ts          # 配对逻辑
├── crypto.ts           # 加解密
├── dedup.ts            # 消息去重
├── http.ts             # HTTP 工具
├── api.ts              # 微信 API 调用
├── storage.ts          # 持久化
├── onboarding.ts       # 初始化流程
├── scaffold.ts         # 脚手架生成
├── templates.ts        # 模板内容
├── knowledge/
│   ├── index.ts        # 知识库统一入口
│   ├── types.ts        # 知识库类型
│   ├── local.ts        # 本地知识库
│   ├── dify.ts         # Dify 集成
│   └── milvus.ts       # Milvus 集成
└── features/
    ├── menu.ts         # 菜单功能
    ├── assistant-toggle.ts  # AI 开关
    └── usage-limit.ts  # 使用限制

templates/
├── enterprise.md       # 企业客服模板
├── enterprise-identity.md
├── content.md          # 内容助手模板
├── content-identity.md
├── general.md          # 通用客服模板
├── general-identity.md
└── questions.md        # 常见问题模板
```

## 当前未完成功能

- AES 加解密完整链路测试
- 非文本消息（图片/语音/视频）细分处理
- 菜单/AI 开关/usage limit 接入真实链路
- 完整 OpenClaw runtime 适配验证
- 自动化测试
