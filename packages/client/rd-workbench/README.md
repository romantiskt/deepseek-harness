---
description: 'Use a prominent AI conversation alongside six-stage workflow nodes, artifacts and activity.'
kind: 'package-reference'
---

# @deepseek-ai/dsh-client-rd-workbench

English | [中文](README.zh.md)

## Summary

Members can create requirements, plan versions and follow review, development and testing in the Harness browser. The conversation remains the main work area, with a separate node and artifact panel. Focus mode expands the conversation; drafts stay scoped to the selected context.

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

The bundle mounts this package without package-specific configuration. Sign in to the local project, select a version and use the stage strip to browse its nodes. Browsing never changes business status.

The first visit creates an administrator only when the project has no members. Later visits use existing local accounts. Invalid credentials show retry guidance without clearing the form; expired sessions ask the member to sign in again. Account instructions are in the [pilot guide](../../../docs/operations/ai-rd-pilot.md#members).

---

<a id="understand-the-implementation"></a>

## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The [model](src/client/model.ts) calls authenticated Remote methods and preserves idempotency keys across ambiguous failures. The [workbench](src/client/workbench.tsx) displays actual Harness transcripts, durable artifacts and role-specific forms. Source edits run on the host runtime.

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

Only a submitted user request reaches `rdRuntime.prompt`. View selection, unsent drafts and layout changes do not submit messages.

#### Token effect

The runtime owns prompt size and tool output; the browser adds no hidden prompt.

#### KV Cache effect

Opening a panel does not alter model input. The runtime owns session and baseline selection.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The initial pilot uses Chinese copy in both locale dictionaries. The browser polls active transcripts; enterprise SSO and collaborative editing are deferred.

<a id="dev-note"></a>

### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
