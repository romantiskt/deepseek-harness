# DeepSeek Harness 源码基线

[English](upstream-baseline.md) | 中文

[机器可读基线](upstream-pin.json)记录本地实现采用的官方仓库、准确源码修订及工具链。当前分支保留官方 Git 历史和用户提供的设计文件。

扩展位于[研发包](../../packages/rd/README.zh.md)、客户端工作台与叠加式 bundle。它组合在标准 Web 配置之上，复用现有 Agent Loop、模型设置与会话持久化。

锁文件保留上游依赖解析结果，新增本地包引用。已验证安装使用冻结锁文件和本地包缓存。可选桌面分发不在本次试运行范围。

构建与启动见[试运行指南](ai-rd-pilot.zh.md)，证据见[验收记录](../acceptance/phase-1.zh.md)。
