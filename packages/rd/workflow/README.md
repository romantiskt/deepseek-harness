---
description: 'Keep requirements, version reviews, candidate tests and change approvals durable across restarts.'
kind: 'package-reference'
---

# @deepseek-ai/dsh-rd-workflow

English | [中文](README.zh.md)

## Summary

Members can move a version through six stages with explicit reviews and immutable evidence. Independent product, developer and tester permissions control each operation. Failed or repeated commands do not duplicate committed work. One local installation owns one project.

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

The R&D bundle mounts this service. For custom compositions, mount the package with an absolute database filename.

```yaml
- name: '@deepseek-ai/dsh-rd-workflow'
  config:
    databasePath: /tmp/rd-pilot/workflow.sqlite
```

| Field          | Default  | Meaning                                                |
| -------------- | -------- | ------------------------------------------------------ |
| `databasePath` | required | Absolute SQLite file; its parent is created privately. |

Every committed command materializes Markdown under `artifacts/<project-id>/` beside the database: a project index, immutable `artifacts/<artifact-id>.md` files, and six stage documents plus an index under `versions/<version-id>/`. Each file includes its local folder path and file-manager commands. Existing projects are exported on their first read after startup. In-memory databases do not export files.

SQLite remains authoritative. Submit revisions in the workbench; editing generated files does not update business state. File errors are reported after the transaction commits; retrying the same command repairs the export without duplicating records. Indexes update with each revision, while existing artifact files retain their contents.

---

<a id="understand-the-implementation"></a>

## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The [repository](src/repository.ts) authenticates members and writes one project transaction with a command receipt and activity record. Immutable artifacts retain prior requirement and baseline references. Development reviews bind a full commit; test batches and UAT remain independent.

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

The runtime selects business records for its model context. `rdWorkflow.execute` does not infer approval from assistant text.

#### Token effect

The service itself adds no model tokens; the selected records affect runtime prompts.

#### KV Cache effect

Committed records affect future runtime context; past model inputs remain unchanged.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Project-wide optimistic revisions can reject concurrent independent edits. Local Harness administrators remain trusted; this is not a multi-tenant service.

<a id="dev-note"></a>

### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
