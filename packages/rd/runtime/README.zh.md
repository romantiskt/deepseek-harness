---
description: '通过 Harness 起草需求，仅修改明确选择的本地开发工作区。'
kind: 'package-reference'
---

# @deepseek-ai/dsh-rd-runtime

[English](README.md) | 中文

## 概述

产品成员可在限定上下文的对话中起草需求。范围冻结后，开发可修改任务绑定的工作区并执行明确的本地检查。变更请求会先停止相关执行，再由审批更新基线。Harness 保留会话和模型配置。

## 目录

- [使用此包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步阅读](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与后续工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

---

<a id="use-this-package"></a>

## 使用此包

通过 [bundle 配置](../../bundle/rd-workbench/cordis.patch.yml)挂载，配置会提供所有必填限制。运行时使用当前 Harness 模型选择与凭据。

| 字段              | Bundle 值             | 含义                         |
| ----------------- | --------------------- | ---------------------------- |
| `scratchPath`     | `DSH_HOME/rd/scratch` | 不包含产品源码权限。         |
| `maxFileBytes`    | 524288                | 每个源码文件的最大字节数。   |
| `maxContextChars` | 64000                 | 业务提示词最大字符数。       |
| `maxMessages`     | 200                   | 每次刷新返回的会话消息数。   |
| `maxOutputBytes`  | 1048576               | 每个检查输出流保留的字节数。 |
| `checkTimeoutMs`  | 120000                | 本地检查超时。               |
| `processGraceMs`  | 3000                  | 终止进程的宽限时间。         |

---

<a id="understand-the-implementation"></a>

## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[运行时](src/index.ts)为每个成员的 Harness 会话固定需求、版本、基线和任务。文件工具每次访问都重新检查任务准入与工作区归属。现有受管子进程服务管理本地检查；基线更新等待进程退出。

</details>

---

<a id="further-exploration"></a>

## 进一步阅读

- [本地试运行](../../../docs/operations/ai-rd-pilot.zh.md)——启动与主线操作。
- [包地图](../../rd/README.zh.md)——工作流职责。
- [架构决策](../../../.agents/notes/implemented/architecture/2026-10-03-ai-rd-workflow.zh.md)——持久化与执行选择。

---

<a id="model-experience"></a>

## 模型体验

### 研发上下文

#### 模型看到的内容

模型接收选定需求、任务、缺陷、近期材料和用户请求。产品会话获得起草工具；符合准入条件的开发会话另有受限文件工具。凭据不会进入此上下文。

#### Token 影响

业务上下文受 `maxContextChars` 限制；近期文档逐个截断。文件读取与工具结果在文件限制范围内增加 Token。

#### KV Cache 影响

新一轮对话追加当前业务上下文。切换基线会选择不同上下文键；切换工作区会先重建工具，再恢复成员会话。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- 执行限定本机，并信任主机管理员。新开发会话需要干净工作区。本地检查支持 npm test/build/lint 脚本；外部 CR、CI 和发布集成后续实现。

<a id="dev-note"></a>

### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
