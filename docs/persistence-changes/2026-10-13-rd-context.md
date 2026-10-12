---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-10-13-rd-context

English | [中文](2026-10-13-rd-context.zh.md)

## Summary

Adds the rd-context attribution for logged workflow context.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

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
## Compatibility

Existing Session events remain valid. The new source only labels user-role context; consumers preserve unknown attribution kinds. Human requests keep the existing user source, and model input remains reconstructable from the log.

<a id="verification"></a>
## Verification

The scoped runtime test verifies separate context injection and human input. The built keyless R&D replay verifies drafting and Markdown exports.

<a id="dev-note"></a>
## Dev Note

None.
