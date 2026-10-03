---
description: '定位研发命令校验、持久化工作流状态和限定范围的 Harness 执行负责人。'
kind: 'package-group'
---

# rd/ — AI-native R&D

[English](README.md) | 中文

## 概述

本组连接对话需求、版本评审、所选工作区开发、测试和交付记录。工作流服务管理业务决策，运行时管理限定范围的 Harness 执行。客户端与 bundle 将这些能力组合成本地工作台。

## 目录

- [包列表](#packages)
- [相关文档](#related-documentation)
- [开发备注](#dev-note)

---

<a id="packages"></a>

## 包列表

根据要修改的行为选择所属包。

| 包                                  | 职责                                   |
| ----------------------------------- | -------------------------------------- |
| [contracts](contracts/README.zh.md) | 公开记录与命令校验。                   |
| [workflow](workflow/README.zh.md)   | 认证后的持久化业务流转。               |
| [runtime](runtime/README.zh.md)     | 限定上下文的 AI 会话与所选工作区执行。 |

<a id="related-documentation"></a>

## 相关文档

- [客户端](../client/rd-workbench/README.zh.md)——工作台操作。
- [Bundle](../bundle/rd-workbench/README.zh.md)——本地配置组合。
- [试运行指南](../../docs/operations/ai-rd-pilot.zh.md)——启动和操作。

<a id="dev-note"></a>

## 开发备注

无。
