clawbot
APP
 — 昨天21:23
channel id：wechat-mp
客服 agent id：wechat-mp-cs

原因是更不容易跟：
企业微信 / wecom
其他微信类入口
混淆。

---

安装时要不要引导创建客服人设和知识库？
要，而且我觉得这是这个插件能不能“真的好用”的关键。

因为公众号客服和普通 agent 最大区别不是“能回复”，而是：

有没有明确角色
有没有基础知识库
有没有升级路径
有没有内容边界

如果安装时只让用户填：
appId
appSecret
token

那最多只是“接上了渠道”，不是“一个能用的客服”。

---

我建议把安装流程做成两段式
第一段：渠道接入
先完成技术层接入：
AppID / Secret / Token / AES Key
webhookPath
dm policy
paired / unpaired routing

这一段保证“能连上”。

---

第二段：客服初始化向导
安装完后继续引导用户配置客服 agent：

#### A. 创建或选择客服 agent
给用户两个选项：

使用现有 agent
自动创建一个新的客服 agent（推荐）
比如：

wechat-mp-cs

#### B. 初始化 agent 基础文件
自动生成：

IDENTITY.md
SOUL.md
USER.md
AGENTS.md
TOOLS.md

这一步非常值得做。

#### C. 初始化知识库目录
建议生成一个标准目录，比如：
workspace/wechat-mp-cs/
├── knowledge/
│ ├── company.md
│ ├── products.md
│ ├── faq.md
│ ├── contact.md
│ ├── articles.md
│ └── escalation.md


#### D. 引导用户补充核心信息
至少问这些：

品牌/公司名称
服务对象是谁
主要产品/服务
常见问题
联系方式
什么时候转人工
禁止回答什么

---

我建议把“客服初始化”做成插件的标准能力
不是单独写在 README 里，而是做成onboarding 的正式步骤。

也就是安装时：

Step 1
配置公众号连接

Step 2
询问是否启用“未配对用户 → 客服 agent”模式

Step 3
如果启用：
自动创建 wechat-mp-cs
自动生成基础 persona 文件
自动生成知识库模板

Step 4
提示用户去补充内容，并给一个 checklist

这样体验会像真正的官方插件，而不是“装完你自己研究”。

---

我建议默认生成的知识库内容结构
必填模板
company.md
公司简介
品牌语气
面向哪些人群

products.md
产品/服务列表
每项服务一句话说明
适合谁

faq.md
高频问题
标准回答

contact.md
官网
邮箱
微信/电话/表单

escalation.md
哪些问题必须转人工
哪些问题不能承诺
哪些问题只能收集线索

可选模板
articles.md
cases.md
pricing.md
policies.md

---

客服 agent 的默认人设应该怎么设计？
不要做死，要做成可引导、可覆盖。

默认思路应该是：

亲切
专业
简洁
不乱承诺
优先帮助用户理解问题
遇到价格/交付/投诉类问题主动转人工

这比写一个花哨 persona 更有用。

---

我建议插件里内置三种初始化模板
安装时可以让用户选：
模板 A：企业客服
适合公司官网 / 企业公众号

模板 B：内容助手
适合知识分享、课程、社群型公众号

模板 C：通用客服
适合先跑起来，后续自己改

这样不会把所有人都绑到一个模板上。

---

我的建议结论
所以答案是：
客服 agent id 建议改
安装时强烈建议引导用户建立客服人设和知识库
而且这不应该只是文档建议，最好做成插件 onboarding 的正式流程

---

如果你点头，下一步我就继续做：

第 2.5 步：把这个新项目的安装/初始化流程正式设计出来
我会直接给出：
默认命名方案
onboarding 步骤
自动生成哪些文件
知识库模板长什么样
用户第一次安装时会看到什么

然后再往下进入代码实现设计。
对，这点你说得对。
如果按 wecom 这种命名风格来，确实继续叫 wemp 更一致。

因为官方 channel 的命名逻辑本来就不是“用户可读产品名优先”，而是更偏：

简短
稳定
工程语义明确
和生态里已有缩写保持一致

像：

wecom
qqbot

这种都不是面向终端用户的自然语言名，而是工程命名。
所以公众号这边继续叫：
channel id: wemp

是合理的。

---

那我建议这样定
channel id
wemp

客服 agent id
这里我就不建议叫 wechat-cs 了，改成更一致的：

wemp-cs

如果想更明确一点，也可以：
wemp-support

但我还是更偏向：

wemp-cs

原因：
和 wecom / qqbot 风格统一
一看就知道是谁的客服 agent
比 wechat-cs 少歧义

---

这样整体命名就会变成
渠道：wemp
客服 agent：wemp-cs
已配对主 agent：main
未配对路由：wemp-cs

这套命名挺顺。

---

接下来设计也同步按这个来
也就是说后面的新项目方案统一改成：

不是 wechat-mp
而是 wemp 新版官方化项目

同时：
保留 wemp 作为 channel id
但按新项目思路重构
不兼容旧字段，直接上新结构
---

我建议的新配置名字也顺一下
{
"channels": {
"wemp": {
"enabled": true,
"appId": "...",
"appSecret": "...",
"token": "...",
"encodingAESKey": "...",
"webhookPath": "/wemp",
"dm": {
"policy": "pairing",
"allowFrom": []
},
"routing": {
"pairedAgent": "main",
"unpairedAgent": "wemp-cs"
}
}
}
}


这个就很统一了。

---

那我下一步就按这个口径继续：
第 2.5 步：设计新版 wemp 的安装/初始化流程
包括：
wemp / wemp-cs 命名定稿
onboarding 交互步骤
自动创建客服 agent
自动生成 persona / knowledge 模板

你要的话我继续往下出这份方案。
ianshaw — 昨天21:28
客服agent是创建一个新的，然后自动初始化agent基础文件和知识库目录，agent人设引导来设定，可以内置三种初始化模板，渠道wemp 客服agent wemp-kf 已配对主agent 未配对路由wemp-kf，而且这个客服要向现在一样限制命令权限，请按这个继续 @clawbot
clawbot
APP
 — 昨天21:29
好，这个方向已经很清晰了，我给你收敛成一版定稿方案。

---

一、命名定稿
渠道
wemp

客服 agent
wemp-kf

路由
已配对 → main
未配对 → wemp-kf

这套命名没问题，而且挺顺：
wemp 是 channel
wemp-kf 是专门给公众号客服场景的受限 agent
main 继续作为高权限主 agent

---

二、你这版目标我理解为
不是“修旧插件”，而是做一个新版官方化 wemp，并且内置：

渠道接入能力
双 agent 路由
安装时自动创建客服 agent
自动初始化 agent 基础文件
自动初始化知识库目录
引导用户设定客服人设
三种初始化模板
wemp-kf 默认受限工具权限，和你现在一样偏安全

这个产品方向是对的，而且比单纯做 channel 更完整。

---

三、安装 / onboarding 定稿流程
我建议新版 wemp 安装时分成 4 个阶段。

---

阶段 1：渠道接入配置
用户安装 wemp 时先配置：

appId
appSecret
token
encodingAESKey（可选，看模式）
webhookPath
dm.policy

这一阶段只解决“接得上”。

---

阶段 2：路由配置
安装向导继续问：

已配对用户使用哪个 agent？
默认：main
未配对用户是否使用专属客服 agent？
默认：是
客服 agent id？
默认：wemp-kf

如果用户确认，就进入创建流程。

---

阶段 3：自动创建 wemp-kf
自动在 workspace 里创建一个新的 agent 目录，例如：

/root/clawd/agents/wemp-kf/


或者如果 OpenClaw 的 agent 结构更适合独立 workspace，也可以是类似：

text
/root/clawd/wemp-kf/


然后自动生成这些基础文件：

IDENTITY.md
SOUL.md
USER.md
AGENTS.md
TOOLS.md

以及知识库目录：

knowledge/
company.md
products.md
faq.md
contact.md
escalation.md
articles.md


---

阶段 4：客服人设初始化向导
创建完基础文件后，继续引导用户做“人设 + 知识库初始化”。

这里给出三种模板供选：

#### 模板 A：企业客服
适合公司、品牌、服务咨询类公众号

#### 模板 B：内容助手
适合知识分享、课程、媒体、IP 号

#### 模板 C：通用客服
适合先快速上线，后面再细化

用户选模板后，再问几个关键问题，自动填充到文件里。

---

四、wemp-kf 的默认权限模型
这个你已经定了：
要像现在一样限制命令权限。
我同意，而且这个应该是新版的默认安全策略。

---

建议默认允许
web_fetch
web_search
知识库查询相关工具
必要的 channel 内回复能力（由渠道链路负责，不是开放 message 工具）

建议默认禁止
exec
read
write
edit
browser
nodes
process
message
sessions_*
gateway
tts
其他高权限/跨渠道/系统级工具

也就是说：
客服 agent 负责回答和引导
不负责动系统
不负责跨渠道操作
不直接碰主 workspace

这才符合公众号“公开入口”的安全边界。

---
五、我建议的 wemp-kf 初始化文件内容
---

IDENTITY.md
定义：

名称
身份
语气
面向对象
角色定位

例如：
公众号客服
智能咨询助手
内容推荐助手
---

SOUL.md
定义更稳定的人设底色：

亲切
专业
简洁
不乱承诺
不装懂
遇到报价/交付/投诉类问题转人工

---

USER.md
这里不是写“单个用户”，而是写服务对象画像：
面向哪些人群
他们常问什么
他们最关心什么
应该如何引导他们

---

AGENTS.md
重点写：

回复长度规则
何时推荐文章
何时转人工
何时拒答
工具权限边界
不允许做的事
---

TOOLS.md
给客服 agent 写清楚：
有哪些可用工具
适合怎么查资料
知识库在哪里
联系方式怎么说

---

六、知识库目录建议
我建议默认生成这些：

必备文件
knowledge/company.md
knowledge/products.md
knowledge/faq.md
knowledge/contact.md
knowledge/escalation.md

可选文件
knowledge/articles.md
knowledge/cases.md
knowledge/pricing.md

---

七、三种模板建议内容
---

模板 A：企业客服
适合：
企业官网
SaaS
AI 服务商
咨询公司

特点：
强调专业和信任
擅长介绍产品与服务
擅长识别合作意向
敏感问题及时转人工

---

模板 B：内容助手
适合：
公众号内容型账号
教育/课程
知识型 IP

特点：
更会推荐文章
更会解释概念
更像内容陪伴助手
商务感更弱

---

模板 C：通用客服
适合：
用户还没想清楚怎么定位
先跑起来再说

特点：
语气中性
边界清晰
不偏销售，也不偏内容运营

---

八、向导里建议问的关键问题
我建议不要问太多，但要问准。

必问
你的品牌/公众号名称是什么？
主要服务哪些人？
核心提供什么产品或服务？
遇到什么问题必须转人工？
联系方式是什么？
希望客服更偏：
专业咨询
内容推荐
通用接待

可选
有没有推荐文章/官网链接？
有没有不能回答的话题？
希望回复风格偏：
简洁
亲切
专业正式

---

九、配置定稿建议
新版 wemp 主配置我建议就长这样：
{
"channels": {
"wemp": {
"enabled": true,
"appId": "...",
"appSecret": "...",
"token": "...",
"encodingAESKey": "...",
"webhookPath": "/wemp",
"dm": {
"policy": "pairing",
"allowFrom": []
},
"routing": {
"pairedAgent": "main",
"unpairedAgent": "wemp-kf"
}
}
}
}


重点是：
不再搞旧字段
不把业务菜单内容混进基础 channel 配置
先把“接入 + 路由 + 安全”做干净

---

十、下一步该怎么继续
按这个定稿，下一步就该进入：

第 3 步：输出“新版 wemp 的项目骨架设计”
我会继续给你：
目录结构
模块职责划分
onboarding 要生成的文件模板
wemp-kf 的默认受限工具配置
第一阶段实现顺序

然后再下一步就可以真正开始改/写代码了。

如果你没异议，我下一条就直接继续第 3 步。
ianshaw — 昨天21:39
继续 @clawbot
clawbot
APP
 — 昨天21:40
好，继续。
现在进入 第 3 步：新版 wemp 项目骨架设计。

这一步的目标不是写细节代码，而是把：

目录
模块职责
初始化产物
权限模型
实现顺序

全部定死，避免后面一边写一边漂。

---

一、项目目标再收敛一句话
新版 wemp 是一个：

官方风格的微信公众号 channel 插件
内置 双 agent 路由
安装时可自动创建 受限客服 agent wemp-kf
可引导初始化 人设与知识库

---

二、项目目录结构
我建议新版 wemp 目录长这样：

wemp/
├── src/
│ ├── channel.ts
│ ├── config-schema.ts
│ ├── config.ts
│ ├── types.ts
│ ├── runtime.ts
│ ├── log.ts
│ │
│ ├── api.ts
│ ├── crypto.ts
│ ├── http.ts
│ ├── webhook.ts
│ ├── inbound.ts
│ ├── outbound.ts
│ │
│ ├── security.ts
│ ├── pairing.ts
│ ├── routing.ts
│ ├── status.ts
│ │
│ ├── onboarding.ts
│ ├── scaffold.ts
│ ├── templates.ts
│ │
│ └── features/
│ ├── menu.ts
│ ├── assistant-toggle.ts
│ └── usage-limit.ts
│
├── README.md
├── openclaw.plugin.json
├── package.json
├── tsconfig.json
└── LICENSE


---

三、模块职责划分
---

channel.ts
这是插件主入口。

负责：
导出 plugin meta
capabilities
configSchema
security
outbound
gateway
status
onboarding

一句话：
所有官方插件接口都在这里挂载。

---

config-schema.ts
负责定义新版 wemp 的唯一配置结构。

重点只定义：
基础账号配置
dm.policy / allowFrom
routing.pairedAgent / unpairedAgent
可选 features 开关

不要把大量业务文案直接堆进主 schema。

---

config.ts
负责：
解析账户配置
默认值
多账号支持
安全读取 secret
resolve routing / resolve dm policy
一句话：
一切配置读取都在这里统一收口。

---

types.ts
负责：
channel config 类型
account 类型
inbound event 类型
runtime snapshot 类型

要求：
尽量不出现 any
为 webhook、message、menu event 留清晰结构

---
runtime.ts
负责：
保存 plugin runtime
获取 runtime
保证未初始化时明确报错

不建议继续可空随便取。

---

api.ts
负责：
获取 access token
客服消息发送
素材上传
媒体下载
微信 API 请求封装
不要在别的文件里散落直接请求微信接口。

---

crypto.ts
负责：
签名校验
AES 解密/加密
XML 处理相关安全逻辑

---

http.ts
负责：
读取请求 body
解析 query
响应 helper
body size limit 等基础 HTTP 工具

---

webhook.ts
负责：
注册 webhook
分发 webhook 请求
区分 GET 验证 / POST 消息
调用 inbound 标准化处理

它应该是瘦的，不应该成为业务巨石。

---

inbound.ts
负责：
把微信消息转换成统一 inbound 事件
处理文本/图片/语音/菜单点击等消息类型
调用 routing 决定走哪个 agent
调用 pairing / security 做准入判断

---

outbound.ts
负责：
文本分段
media outbound
微信平台发送限制封装
返回统一 delivery result

---

security.ts
负责：
dm.policy
allowFrom
pairing 相关授权判断
normalize entry
approve hint

这部分要尽量像 wecom 的 security 结构。

---

pairing.ts
负责：
与 OpenClaw pairing runtime 对接
request pairing
approve notify
paired state 查询
如果有本地 opt-out，也要明确是附加层，而不是主授权源。

---

routing.ts
负责：
解析 pairedAgent / unpairedAgent
决定消息该投给 main 还是 wemp-kf
保证路由逻辑唯一，不散落在 webhook/menu 等文件里

---

status.ts
负责：
runtime snapshot
channel summary
lastInboundAt / lastOutboundAt / lastError
account configured/running/connected

这样排障会轻松很多。

---

onboarding.ts
负责：
安装时交互
配置收集
是否创建 wemp-kf
选择初始化模板
调用 scaffold 写文件

这是新版 wemp 很关键的一块。

---
scaffold.ts
负责真正创建：
wemp-kf agent 目录
基础 md 文件
知识库目录
模板文件内容写入

也就是“脚手架层”。

---

templates.ts
负责存放三种客服模板的文本模板：

企业客服
内容助手
通用客服
避免把大段模板文本散在逻辑代码里。

---

features/
这里先保留位置，V1 可以不全部实现。

后续增强能力放这里：
菜单
AI 开关
使用限制

这样主项目骨架不会被污染。

---

四、wemp-kf 的初始化产物
安装时如果用户选择启用未配对客服模式，则自动创建：

<wemp-kf-workspace>/
├── AGENTS.md
├── SOUL.md
├── USER.md
├── IDENTITY.md
├── TOOLS.md
└── knowledge/
├── company.md
├── products.md
├── faq.md
├── contact.md
├── escalation.md
└── articles.md
---

五、wemp-kf 默认权限模型
这个要明确到“可以/不可以”。

允许
回答用户问题
推荐知识库内容
查网页（可选）
查本地知识库
做基础内容解释
引导转人工

禁止
文件系统读写
执行 shell
浏览器自动化
跨渠道主动发消息
改系统配置
管理其他 session
任何高权限操作

---

一个合理的默认工具集
思路上我建议保持接近你现在的模式：

允许：
web_fetch
web_search
知识库查询工具（如果官方环境有）

拒绝：
exec
read
write
edit
browser
message
nodes
process
sessions_*
gateway
canvas
tts

也就是：
能查、能答、能引导；不能动系统。

---
六、三种模板的脚手架内容设计
---

模板 A：企业客服
生成的人设偏：

专业
稳重
面向咨询转化
强调业务介绍与意向识别
对价格/交付问题谨慎

适合企业服务、SaaS、咨询、AI 解决方案。

---
模板 B：内容助手
生成的人设偏：

耐心
清晰
擅长推荐文章
擅长解释概念
商务感较弱

适合公众号内容运营、课程、知识分享。

---

模板 C：通用客服
生成的人设偏：

中性
安全
边界清晰
适合先上线再微调

适合第一次安装、不确定定位的用户。

---

七、onboarding 交互建议
我建议安装时流程像这样：

Step 1：配置公众号接入
AppID
AppSecret
Token
AES Key（可选）
WebhookPath

Step 2：选择未配对模式
未配对用户是否进入客服 agent？
默认：是

Step 3：自动创建客服 agent
默认 agent id：wemp-kf
默认创建新的 agent workspace

Step 4：选择模板
企业客服
内容助手
通用客服

Step 5：采集初始化信息
品牌/公众号名称
服务对象
核心服务
联系方式
哪些问题转人工
回复风格偏好

Step 6：落地脚手架
写 agent 基础文件
写知识库模板
配置 routing.unpairedAgent = wemp-kf

Step 7：完成提示
告诉用户：
已创建哪些文件
去哪里补充知识库
如何测试未配对/已配对流程
---

八、V1 功能范围定稿
必做
wemp channel 基础接入
pairing
paired/unpaired routing
自动创建 wemp-kf
模板式初始化
受限客服 agent 配置
基础文本收发
基础 status

延后
菜单
AI 开关
使用限额
素材/草稿/文章运营 API
富媒体复杂能力

---

九、实施顺序
第一阶段：项目骨架
目录
plugin entry
schema
config / types / runtime

第二阶段：消息链路
webhook
crypto
inbound
outbound

第三阶段：安全与路由
security
pairing
routing

第四阶段：安装体验
onboarding
scaffold
templates

第五阶段：测试与文档
README
示例配置
接入说明
测试路径

---

十、我建议下一步
现在骨架已经定了，下一步最自然的是：

第 4 步：把 wemp-kf 初始化模板和 onboarding 输入项写成具体草案
也就是把下面这些真正写出来：
IDENTITY.md 模板
SOUL.md 模板
AGENTS.md 模板
knowledge/*.md 模板
三种模板差异
安装时每一步问什么
这一步做完，基本就能开始落代码了。

如果你要，我下一条就直接把模板草案写出来。
