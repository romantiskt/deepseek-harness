---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-10-13-rd-context

[English](2026-10-13-rd-context.md) | 中文

## 概述

新增记录业务上下文的 rd-context 来源标识。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

```yaml persistence-change
schemaVersion: 1
id: 2026-10-13-rd-context
baseline: false
changes:
  - root: "event:agent/inbox/spliced"
    previous: "2026-09-21-user-question-reply"
    after: "ebaf2cb47d20ba509b57f8177eb5b53c9a2cc5f07c16f059e90ae2d43d363693"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-09-21-user-question-reply"
    after: "e9bc6b00fbf46c04fdd550868445306ffc7166ead7d28dd820addedef5903f7b"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-09-21-user-question-reply"
    after: "060ec863ff7fb58c900d70eefa7a3bd57aade37f6d7951fc83740b42600f058c"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-09-21-user-question-reply"
    after: "81a6ccca8d25418c2b7aa27dbff78956cf3f73f42590557f8d17c29ce64f5ee9"
    decision: same-version
```

<a id="compatibility"></a>
## 兼容性

已有 Session 事件保持有效。新增来源只标注 user 角色的上下文，消费方保留未知来源类别。用户请求继续使用 user 来源，模型输入仍可从日志重建。

<a id="verification"></a>
## 验证

限定上下文运行时测试验证上下文注入与用户输入分离；构建后的研发无密钥回放验证草稿与 Markdown 导出。

<a id="dev-note"></a>
## 开发备注

无。
