---
description: "向 Harness Web 配置添加本地研发工作台、持久化和限定范围的 AI 执行。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-rd-workbench

[English](README.md) | 中文

## 概述

此层为本地 Web 配置增加六阶段研发工作台。项目启动器会创建配置并链接当前仓库的 bundle。业务数据位于所选 Harness home。此层不执行外部发布。

## 目录

- [使用此包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步阅读](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与后续工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用此包

构建仓库后，在根目录运行 `pnpm run dev:rd`。启动器基于 Web 配置创建 `ai-rd`，并使用受支持的本地 bundle 链接命令。此私有 bundle 未发布到 npm。

具体配置与本地目录设置见[启动器](../../../scripts/rd/start.mjs)，首次登录见[试运行指南](../../../docs/operations/ai-rd-pilot.zh.md)。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[配置补丁](cordis.patch.yml)在现有 Web 组合中插入工作流、运行时和客户端。它明确提供存储与执行限制。标准 Harness 继续管理智能体、模型与会话持久化。

</details>

-----

<a id="further-exploration"></a>
## 进一步阅读

- [本地试运行](../../../docs/operations/ai-rd-pilot.zh.md)——启动与主线操作。
- [包地图](../../rd/README.zh.md)——工作流职责。
- [架构决策](../../../.agents/notes/implemented/architecture/2026-10-03-ai-rd-workflow.zh.md)——持久化与执行选择。

-----

<a id="model-experience"></a>
## 模型体验

### 研发上下文

#### 模型看到的内容

挂载的 `rdRuntime` 负责模型上下文与工具；bundle 不添加提示词文本。

#### Token 影响

运行时控制 Token 用量。

#### KV Cache 影响

运行时管理模型输入变化；bundle 仅组合服务。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- 此 bundle 依赖可信本地 Web 主机及明确配置的 Harness home。它不增加多租户隔离或生产系统集成。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
