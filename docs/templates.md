# 三种模板使用场景

## enterprise（企业客服）
适用：
- 企业官网咨询
- B2B 服务、SaaS、解决方案类账号

特点：
- 语气更稳重、强调可信度
- 更关注线索识别与转人工
- 对价格/交付/投诉类问题更谨慎

## content（内容助手）
适用：
- 课程、社群、知识分享型公众号
- 以文章分发和概念解释为主

特点：
- 更强调“内容推荐 + 解释”
- 对用户提问做导读式回复
- 商务话术比 enterprise 更弱

## general（通用客服）
适用：
- 初次上线，业务尚未定型
- 需要中性、安全、可快速迭代的起点

特点：
- 覆盖基础问答与联系路径
- 规则边界明确，后续可平滑迁移到 enterprise/content

## 选择建议
- 目标是转化与咨询：优先 `enterprise`
- 目标是内容触达与陪伴：优先 `content`
- 目标是先跑通闭环：优先 `general`

## 知识库文件生成策略
- 默认创建（所有模板一致）：`company.md`、`products.md`、`faq.md`、`contact.md`、`escalation.md`、`articles.md`、`cases.md`、`pricing.md`、`policies.md`
- 差异点在内容提示，不在文件数量：`enterprise/content/general` 会写入不同的补充指引
- 生成规则是不覆盖已有文件：已存在则跳过，只创建缺失文件
