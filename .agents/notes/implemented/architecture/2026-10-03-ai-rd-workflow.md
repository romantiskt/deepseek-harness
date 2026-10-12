# Agent Note: Additive local R&D workflow in Harness

Status: implemented

English | [中文](2026-10-03-ai-rd-workflow.zh.md)

## Problem

The local pilot needs durable requirement, review and test decisions while preserving the existing Harness model, session and tool execution. Assistant prose cannot authorize a scope freeze or production release.

## Decision

The [R&D packages](../../../../packages/rd/README.md) compose through an additive local profile. A transactional SQLite project aggregate owns business records; separate tables own member credentials, command receipts and session bindings. Commands re-resolve membership and validate context and expected project revision before applying lifecycle rules.

Requirement revisions, materials and baselines retain immutable references. Technical reviews bind the reviewed materials; development reviews bind a full candidate commit. Each test submission retains its own cases, defects and separate product UAT. Release commands record external evidence and never execute a deployment.

An owned Harness session captures requirement, version, baseline and task. Product sessions receive scoped drafting tools. Source tools require an explicitly bound canonical checkout, selected branch, frozen baseline, task ownership and a per-checkout writer lease. Baseline changes await agent and process quiescence.

The workflow projects committed records into Markdown beside its database. Immutable artifact files preserve each submitted revision; version and stage indexes expose current state. SQLite remains the transaction authority, so a file error can be repaired from a committed command receipt rather than duplicating the operation. Manual edits to exported files are not imported.

The R&D panel retains a standard Session reference and embeds the shared Conversation renderer. This preserves native reasoning, tool presentation and stream handling without a second transcript projection. Its own composer admits input through scoped business checks. Workflow context uses a separately logged `rd-context` message, so the human request stays readable.

## Alternatives considered

Modifying the core agent loop would couple business approvals to upstream model execution. An additive workflow service keeps business state independent. Separate normalized feature tables would support finer concurrency; a single local project aggregate keeps this unpublished pilot transactionally simple at the cost of conservative conflicts.

## Consequences

One installation owns one local project and one repository per candidate. The host administrator and standard Harness management remain trusted. Member permissions protect business commands, not hostile tenants on a shared host. Project-wide optimistic locking can reject unrelated concurrent edits. Enterprise identity, remote runners, multi-repository manifests and automatic release integration remain outside this pilot.

The [pilot guide](../../../../docs/operations/ai-rd-pilot.md) describes startup and recovery. The [acceptance record](../../../../docs/acceptance/phase-1.md) distinguishes real model and filesystem execution from isolated release exercises.
