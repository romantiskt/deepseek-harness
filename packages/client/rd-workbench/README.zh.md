---
description: '在突出显示的 AI 对话旁操作六阶段流程节点、产物和活动记录。'
kind: 'package-reference'
---

# @deepseek-ai/dsh-client-rd-workbench

[English](README.md) | 中文

## 概述

成员可在 Harness 浏览器中创建需求、规划版本并推进评审、开发和测试。对话保持主要工作区域，旁边提供独立节点与产物面板。专注模式扩大对话；未发送文本保留在选定上下文。

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

Bundle 无需本包专属配置即可挂载。登录本地项目后选择版本，通过阶段栏浏览节点。浏览操作不会改变业务状态。

项目没有成员时，首次访问才创建管理员。后续使用已有本地账号登录。账号或密码错误会显示重试说明并保留输入；会话失效会提示重新登录。账号使用说明见[试运行指南](../../../docs/operations/ai-rd-pilot.zh.md#members)。

下一步指引定位首个未完成节点，不会自动批准节点。创建版本前可直接选择未排期需求。产物面板支持保存 Markdown 修订并打开本地文件夹；每项产物显示文件路径。

---

<a id="understand-the-implementation"></a>

## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[模型层](src/client/model.ts)调用认证后的远程方法，在结果不明时保留幂等键。[工作台](src/client/workbench.tsx)显示实际 Harness 会话、持久化产物和角色表单。源码修改由主机运行时执行。对话持有原生 Session 引用，使用共享 Conversation 渲染器；切换上下文、任务或基线时释放先前订阅。业务输入框仍通过认证后的运行时提交。

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

只有已发送的用户请求会进入 `rdRuntime.prompt`。视图选择、未发送文本和布局变化不会提交消息。

#### Token 影响

运行时负责提示词大小和工具输出；浏览器不添加隐藏提示词。

#### KV Cache 影响

打开面板不会改变模型输入。运行时负责会话与基线选择。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- 初期试运行的两个语言字典均使用中文文案。企业 SSO 和协同编辑后续实现。

<a id="dev-note"></a>

### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
