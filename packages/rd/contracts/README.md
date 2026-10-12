---
description: 'Validate R&D commands and share typed requirement, version, review, candidate and change records.'
kind: 'package-library'
---

# @deepseek-ai/dsh-rd-contracts

English | [中文](README.zh.md)

## Summary

Callers can validate a workflow command before changing business state. The workflow service consumes the command parser; the client consumes public types. This library does not grant permissions or perform persistence.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

---

<a id="use-this-package"></a>

## Use this package

The `parseCommand` export rejects malformed envelopes. Import record types from the `./types` export; browser code uses type-only imports. See [command validation](src/commands.ts).

---

<a id="understand-the-implementation"></a>

## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The [record declarations](src/types.ts) describe immutable scope references. Zod validates untrusted input before the workflow applies its role and lifecycle checks. `WorkbenchSnapshot.documentDirectory` identifies the generated Markdown directory, or an empty string for an in-memory repository; it is response metadata and is not persisted in the project.

</details>

---

<a id="further-exploration"></a>

## Further Exploration

- [Local pilot](../../../docs/operations/ai-rd-pilot.md) — startup and the main workflow.
- [Package map](../../rd/README.md) — workflow responsibilities.
- [Architecture decision](../../../.agents/notes/implemented/architecture/2026-10-03-ai-rd-workflow.md) — persistence and execution choices.

---

<a id="model-experience"></a>

## Model Experience

### Workflow context

#### What the model sees

Consumers choose the model-visible content; `parseCommand` creates no prompt or tool.

#### Token effect

This library adds no tokens.

#### KV Cache effect

This library does not modify cached model input.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The declarations describe the local pilot, with one repository per test candidate.

<a id="dev-note"></a>

### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
