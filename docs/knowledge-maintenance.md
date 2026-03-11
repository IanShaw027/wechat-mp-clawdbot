# 知识库维护指南

## 目录建议
- `knowledge/company.md`: 品牌定位、服务边界
- `knowledge/products.md`: 核心服务与适用场景
- `knowledge/faq.md`: 高频问题标准答法
- `knowledge/contact.md`: 联系路径
- `knowledge/escalation.md`: 转人工规则
- `knowledge/articles.md`: 推荐内容
- `knowledge/cases.md` / `pricing.md` / `policies.md`: 可选补充

## 更新频率
- 每周至少一次：`faq.md` 与 `articles.md`
- 每月一次：`products.md`、`pricing.md`
- 重大活动或政策变化后：当天更新 `policies.md` / `contact.md`

## 写作规则
- 一问一答，避免长段宣传语
- 明确“能答/不能答/需转人工”
- 价格与承诺相关内容必须写限制条件

## 质量检查
- 问题是否覆盖近 30 天真实咨询
- 是否存在过期链接、过期活动、过时价格
- 对敏感问题是否有统一升级路径

## 与外部知识库协作
- `local` 作为兜底事实源
- `external/hybrid` 模式下，外部检索失败会回退本地
- 关键规则类内容建议保留在本地 markdown，避免纯外部依赖
