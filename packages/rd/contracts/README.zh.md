---
description: '校验研发命令，共享需求、版本、评审、候选提交和变更的类型。'
kind: 'package-library'
---

# @deepseek-ai/dsh-rd-contracts

[English](README.md) | 中文

## 概述

调用方可在修改业务状态前校验研发命令。工作流服务使用命令解析器，客户端使用公开类型。本库不授予权限，也不执行持久化。

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

`parseCommand` 导出会拒绝格式错误的命令。通过 `./types` 导出导入记录类型；浏览器仅导入类型。参见[命令校验](src/commands.ts)。

---

<a id="understand-the-implementation"></a>

## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[记录声明](src/types.ts)定义不可变范围引用。Zod 先校验不可信输入，再由工作流检查角色和生命周期。

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

模型可见内容由消费方选择；`parseCommand` 不创建提示词或工具。

#### Token 影响

本库不增加 Token。

#### KV Cache 影响

本库不修改模型缓存输入。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- 这些声明描述本地试运行；一个提测候选对应一个仓库。

<a id="dev-note"></a>

### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
