---
description: "Add the local R&D workbench, persistence and scoped AI execution to a Harness Web profile."
kind: "package-bundle"
---

# @deepseek-ai/dsh-rd-workbench

English | [中文](README.zh.md)

## Summary

This layer adds the six-stage R&D workbench to a local Web profile. The project launcher creates the profile and links this checkout bundle. Business data lives under the chosen Harness home. The layer does not perform external deployments.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

After building the checkout, run `pnpm run dev:rd` from the repository root. The launcher creates `ai-rd` from the Web profile and uses the supported local bundle link command. This private bundle is not published to npm.

See the [launcher](../../../scripts/rd/start.mjs) for the exact profile and local-home setup, and [pilot guide](../../../docs/operations/ai-rd-pilot.md) for first sign-in.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The [patch](cordis.patch.yml) inserts workflow, runtime and client rows into the existing Web composition. It supplies explicit storage and execution limits. The standard Harness still owns agents, models and session persistence.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Local pilot](../../../docs/operations/ai-rd-pilot.md) — startup and the main workflow.
- [Package map](../../rd/README.md) — workflow responsibilities.
- [Architecture decision](../../../.agents/notes/implemented/architecture/2026-10-03-ai-rd-workflow.md) — persistence and execution choices.

-----

<a id="model-experience"></a>
## Model Experience

### Workflow context

#### What the model sees

The mounted `rdRuntime` owns model-facing context and tools; the bundle contributes no prompt text.

#### Token effect

The runtime controls token use.

#### KV Cache effect

The runtime owns changes to model input; the bundle only composes its services.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- This bundle assumes a trusted local Web host and explicitly configured Harness home. It does not add multi-tenant isolation or production system integrations.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
