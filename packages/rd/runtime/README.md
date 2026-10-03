---
description: 'Draft requirements with Harness and edit only the explicitly selected local development checkout.'
kind: 'package-reference'
---

# @deepseek-ai/dsh-rd-runtime

English | [中文](README.zh.md)

## Summary

Product members can draft requirements in a scoped conversation. Developers can edit the checkout bound to their task and run explicit local checks after scope freezing. Change requests stop affected execution before approval changes the baseline. Harness retains the conversations and model configuration.

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

Mount through the [bundle patch](../../bundle/rd-workbench/cordis.patch.yml), which supplies every required limit. The runtime uses the current Harness model selection and credentials.

| Field             | Bundle value          | Meaning                                  |
| ----------------- | --------------------- | ---------------------------------------- |
| `scratchPath`     | `DSH_HOME/rd/scratch` | No product source authority.             |
| `maxFileBytes`    | 524288                | Maximum source bytes per file.           |
| `maxContextChars` | 64000                 | Maximum business prompt characters.      |
| `maxMessages`     | 200                   | Transcript messages per refresh.         |
| `maxOutputBytes`  | 1048576               | Collected bytes per check output stream. |
| `checkTimeoutMs`  | 120000                | Local check timeout.                     |
| `processGraceMs`  | 3000                  | Termination grace interval.              |

---

<a id="understand-the-implementation"></a>

## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The [runtime](src/index.ts) gives each owned Harness session a fixed requirement, version, baseline and task. File tools recheck task admission and checkout ownership on each access. The existing managed subprocess service owns local check lifecycle; a baseline mutation waits for processes to exit.

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

The model receives selected requirements, tasks, defects, recent materials and the user request. Product sessions get drafting tools; an admitted developer session also gets bounded file tools. Credentials never enter this context.

#### Token effect

Business context is bounded by `maxContextChars`; recent documents are individually truncated. File reads and tool results add tokens within the configured file limits.

#### KV Cache effect

New turns append the current business context. Switching baseline selects a different context key; switching workspace rebuilds the tools before resuming the owned session.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Execution is local and trusts the host administrator. New development sessions require a clean checkout. Local checks support npm test/build/lint scripts; external CR, CI and deployment integrations are deferred.

<a id="dev-note"></a>

### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
