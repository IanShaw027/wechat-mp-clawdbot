# wemp v2 进展

## 已完成
- 项目骨架目录创建
- 插件基础元数据与 channel 入口骨架
- config-schema 定义
- types / runtime / routing / security / status 骨架
- config.ts：多账号、dm、routing、knowledge、features、默认值解析
- onboarding / scaffold / templates 基础实现
- 三种客服模板占位
- `wemp-kf` 默认受限权限边界已写入模板 AGENTS.md
- 最小消息链路骨架：webhook / inbound / outbound / pairing
- 最小 webhook 闭环：
  - GET 验签回显 echostr
  - POST 文本消息解析
  - 按 allowFrom 判断 paired/unpaired
  - 路由到 `main` 或 `wemp-kf`
- runtime 派发骨架：
  - dispatchToAgent
  - sessionKey 规范化
  - 将 inbound 投递给目标 agent
- 真实文本 outbound：调用微信客服消息 API
- onboarding 落地：可运行 scaffold 生成 `wemp-kf`
- onboarding 不覆盖已有文件，只补缺失文件
- 知识库 provider 骨架：local / dify / milvus
- 最小增强接入：assistant-toggle / usage-limit / knowledge search 已接入 inbound 主流程
- P0 第一轮补全：
  - AES 加解密与消息签名校验 helpers
  - encrypted reply 构造
  - webhook 去重骨架（msgId/eventKey/createTime）
  - image / voice / event 消息解析与归一化文本
  - subscribe / unsubscribe 事件占位处理
  - outbound typed result + token cache/retry
  - assistant-toggle / usage-limit 本地文件持久化
  - dify / milvus HTTP 检索骨架
- P0/P1 第二轮补全：
  - feature 配置解析（welcome / handoff / usageLimit / menu）
  - usage-limit 真正限额判定
  - click 事件动作（handoff / assistant_on / assistant_off）
  - menu 同步 API 骨架
  - welcome 文案配置化
  - handoff 文案配置化

## 当前状态
- 已具备结构化实现基础
- 已具备最小 webhook 验证与文本路由闭环
- 已具备最小 runtime 派发骨架与真实文本 outbound
- 已具备知识库 provider 绑定结构与 scaffold 非覆盖策略
- 增强功能已从纯骨架进入可配置接线阶段
- 已进入 P0/P1 真实实现阶段，不再只是纯骨架
- 仍缺少完整 OpenClaw runtime 适配验证
- 仍缺少更完整的事件/媒体链路、人工接管外发、menu 实际联调和测试

## 下一步
1. 继续补 runtime 联调、降级与错误分类
2. 校验 menu/Dify/Milvus 实际 API 兼容性
3. 增加最小测试与真实联调
4. 视需要把 handoff 从“回复联系方式”升级为跨渠道人工通知
