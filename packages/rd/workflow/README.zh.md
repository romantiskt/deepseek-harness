---
description: '让需求、版本评审、候选测试和变更审批在重启后保留。'
kind: 'package-reference'
---

# @deepseek-ai/dsh-rd-workflow

[English](README.md) | 中文

## 概述

成员可通过明确评审和不可变证据推进六阶段版本流程。产品、研发和测试的独立权限约束每次操作。失败或重复命令不会重复写入。一套本地部署对应一个项目。

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

研发 bundle 会挂载此服务。自定义组合需提供数据库绝对路径。

```yaml
- name: '@deepseek-ai/dsh-rd-workflow'
  config:
    databasePath: /tmp/rd-pilot/workflow.sqlite
```

| 字段           | 默认值 | 含义                                    |
| -------------- | ------ | --------------------------------------- |
| `databasePath` | 必填   | SQLite 绝对路径；父目录以私密权限创建。 |

每次命令提交后，在数据库同级的 `artifacts/<project-id>/` 生成 Markdown：项目索引、不可变的 `artifacts/<artifact-id>.md`，以及 `versions/<version-id>/` 下的六个阶段文档和版本索引。每个文件包含本地文件夹路径与打开命令。已有项目在启动后首次读取时导出；内存数据库不导出文件。

SQLite 是业务记录的权威来源。请在工作台提交修订；编辑生成文件不会更新业务状态。文件错误在事务提交后报告；使用同一命令重试可补齐导出，不会重复创建记录。索引随修订更新，已有产物文件保留原文。

---

<a id="understand-the-implementation"></a>

## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[仓库层](src/repository.ts)认证成员，并在一个项目事务中写入命令回执与活动记录。不可变产物保留旧需求和基线引用。开发评审绑定完整提交；测试批次与 UAT 独立。

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

运行时选择业务记录作为模型上下文。`rdWorkflow.execute` 不会根据助手文本推断审批通过。

#### Token 影响

服务本身不增加模型 Token；被选择的记录会影响运行时提示词。

#### KV Cache 影响

已提交记录影响后续运行时上下文；历史模型输入保持不变。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- 项目级乐观修订可能拒绝同时进行的无关修改。本地 Harness 管理员属于受信任主体；这里不提供多租户隔离。

<a id="dev-note"></a>

### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
