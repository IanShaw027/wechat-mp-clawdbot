/**
 * wemp 插件配置 JSON Schema
 * 用于配置校验和 Control UI 表单生成
 */
import { Type, type Static } from "@sinclair/typebox";

export const WempConfigSchema = Type.Object({
  enabled: Type.Optional(Type.Boolean({ 
    description: "是否启用微信公众号渠道",
    default: false,
  })),
  appId: Type.Optional(Type.String({ 
    description: "公众号 AppID",
  })),
  appSecret: Type.Optional(Type.String({ 
    description: "公众号 AppSecret",
    format: "password",
  })),
  token: Type.Optional(Type.String({ 
    description: "消息校验 Token",
  })),
  encodingAESKey: Type.Optional(Type.String({ 
    description: "消息加解密密钥（可选，启用加密模式时需要）",
  })),
  webhookPath: Type.Optional(Type.String({ 
    description: "Webhook 路径",
    default: "/wemp",
  })),
  name: Type.Optional(Type.String({ 
    description: "账号名称（用于多账号区分）",
  })),
  
  // 策略配置
  dmPolicy: Type.Optional(Type.Union([
    Type.Literal("open"),
    Type.Literal("pairing"),
    Type.Literal("allowlist"),
  ], { 
    description: "私聊策略：open-开放 pairing-需配对 allowlist-白名单",
    default: "pairing",
  })),
  allowFrom: Type.Optional(Type.Array(Type.String(), {
    description: "白名单用户 OpenID 列表",
  })),
  
  // 客服 Agent 配置
  csAgent: Type.Optional(Type.Object({
    enabled: Type.Optional(Type.Boolean({ 
      description: "是否启用客服 Agent（未配对用户）",
      default: true,
    })),
    agentId: Type.Optional(Type.String({ 
      description: "客服 Agent ID",
      default: "wechat-cs",
    })),
    model: Type.Optional(Type.String({ 
      description: "客服 Agent 使用的模型",
    })),
    systemPrompt: Type.Optional(Type.String({ 
      description: "客服 Agent 系统提示词",
    })),
  })),
  
  // 菜单配置
  syncMenu: Type.Optional(Type.Boolean({ 
    description: "启动时是否同步自定义菜单",
    default: false,
  })),
  menu: Type.Optional(Type.Object({
    button: Type.Array(Type.Object({
      name: Type.String({ description: "菜单名称" }),
      type: Type.Optional(Type.String({ description: "菜单类型" })),
      key: Type.Optional(Type.String({ description: "菜单 key" })),
      url: Type.Optional(Type.String({ description: "跳转 URL" })),
      sub_button: Type.Optional(Type.Array(Type.Object({
        name: Type.String(),
        type: Type.String(),
        key: Type.Optional(Type.String()),
        url: Type.Optional(Type.String()),
      }))),
    })),
  }, { description: "自定义菜单配置" })),
  
  // 使用限制
  usageLimit: Type.Optional(Type.Object({
    enabled: Type.Optional(Type.Boolean({ default: false })),
    dailyLimit: Type.Optional(Type.Number({ default: 100 })),
    monthlyLimit: Type.Optional(Type.Number({ default: 1000 })),
  }, { description: "使用限制配置" })),
  
}, { additionalProperties: false });

export type WempConfig = Static<typeof WempConfigSchema>;

/**
 * UI Hints for Control UI
 */
export const WempConfigUiHints = {
  "appId": {
    label: "AppID",
    placeholder: "wx1234567890abcdef",
  },
  "appSecret": {
    label: "AppSecret",
    placeholder: "your_app_secret",
    sensitive: true,
  },
  "token": {
    label: "消息校验 Token",
    placeholder: "your_token",
  },
  "encodingAESKey": {
    label: "加密密钥",
    placeholder: "43位字符",
    sensitive: true,
  },
  "webhookPath": {
    label: "Webhook 路径",
    placeholder: "/wemp",
  },
  "dmPolicy": {
    label: "私聊策略",
    options: [
      { value: "open", label: "开放（所有人可用）" },
      { value: "pairing", label: "配对（需要配对码）" },
      { value: "allowlist", label: "白名单（仅指定用户）" },
    ],
  },
  "csAgent.enabled": {
    label: "启用客服 Agent",
  },
  "csAgent.agentId": {
    label: "客服 Agent ID",
  },
  "syncMenu": {
    label: "启动时同步菜单",
  },
};
