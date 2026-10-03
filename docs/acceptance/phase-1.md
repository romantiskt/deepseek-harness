# Phase 1 acceptance record

English | [中文](phase-1.zh.md)

This record separates functional acceptance from external production integration. The implementation runs on the official pinned Harness source and uses its actual model, session and execution services. Evidence identities are in the [structured record](phase-1-evidence.json).

<a id="scope"></a>
## Delivered scope

The local workbench provides six stages and 31 nodes, conversational requirement drafts, requirement revisions, version assignment, parallel human reviews and frozen baselines. Developers explicitly select a local checkout, use scoped AI file tools, inspect diffs and run local checks. Immutable submissions, test cases, defect retest, independent UAT, external release records, feedback requirements and scope changes share one authenticated workflow.

<a id="live"></a>
## Live pilot evidence

The local project is named “AI 研发一期验收”. Product, developer and tester operations used separate local accounts. Every approval carries an isolated-test label and does not represent real business approval.

1. A real DeepSeek conversation generated a structured version-formatting requirement. The browser edited and saved the draft into a version. A real provider-configuration error was exposed first, then corrected and successfully retried.
2. Reviewed requirements and design materials produced baseline B1. The developer bound a separate local Git checkout. AI read and modified its source while preserving the existing tests; the local npm check produced a saved report.
3. The first actual candidate was committed and archived. Testing reproduced a real defect: an invalid object with a throwing conversion hook produced Error instead of the required TypeError. The test batch failed and returned to development.
4. AI repaired the error-message construction. A regression file exercised three hostile object forms in all three parameter positions. The second candidate passed three test groups, including nine coercion checks, and was committed and archived.
5. A development-stage scope change added explicit regression criteria. Approval paused the task, preserved B1 and the unaffected product review, and required renewed technical/test reviews before B2. A testing-stage change was rejected without altering the active batch.
6. The second submission used the new clean commit and candidate-specific review evidence. Testers verified the defect on this new batch and completed test exit. Product then recorded independent UAT approval.
7. The actual candidate archive was copied and extracted into isolated gray/full directories, and tests ran again from those files. The workflow recorded this local exercise, feedback, retrospective and knowledge, then closed the version. No production service was deployed.

<a id="checks"></a>
## Automated and browser checks

The focused workflow, runtime and client suite passes 33 tests across 15 files. Host/client TypeScript and the full local Web build pass. The focused linter passes. The tests cover persistence, role forgery, optimistic revisions, idempotency, stale drafts, immutable baselines, candidate mismatch, defect retest, rejected UAT, closed release state and workspace switching.

The added keyless session replay also passes: `pnpm run test:rd:integration` assembles Harness through the official launcher, replays two calls from a real DeepSeek session, compares the draft with the recording, saves the requirement into a version and reads the same transcript. Run `pnpm run build:rd` first.

The independent final review identified five important issues. Regression tests reproduced them before the repair pass: candidate-specific approvals, revised design evidence, selected-workspace rebinding, UAT rejection recovery and release after closure. All five focused regressions pass after repair.

The broader upstream GUI suite ran 9,780 passing tests and one skipped test, with five initial failures. Three workbench theme failures were fixed and passed focused reruns. Two untouched upstream cases still fail when rerun alone: PDF smoke lacks the optional native canvas binding, and trajectory bundle registration is missing its expected tab. This record does not claim that the complete upstream GUI or CI suite is green.

Browser acceptance used the actual assembled workbench for version creation, real AI drafting, saved artifacts, role login, development conversation, source edits and local checks. Business API acceptance used the same authenticated Remote methods for review, submission, defect closure, changes and release records. No screenshot-only mock was used.

The final browser pass on 2026-10-04 verified 1440px and 960px columns, the 720px single-column layout without horizontal overflow, light/dark readability, focus-mode restoration, context-specific draft recovery after navigation and reload, and scrolling to the latest reply. The narrow conversation keeps its composer visible while the transcript scrolls. Actual screenshots: [workbench](../../output/acceptance/phase-1-workbench.jpg), [narrow layout](../../output/acceptance/phase-1-narrow.jpg), [dark theme](../../output/acceptance/phase-1-dark.jpg). Temporary browser size and theme settings were restored. Client localization and TypeScript path checks pass.

<a id="limitations"></a>
## Remaining boundaries

- Production release, external CR/CI systems, remote execution hosts, enterprise identity and multi-project collaboration are not verified or implemented by this pilot.
- Historical acceptance data is retained. A display defect found after a change left the first closed sample’s task-plan node pending; new workspace confirmation now renews that derived node and has a regression test. The subsequent version “v0.1.1 · 主线复验” completed two baselines and 31/31 passed nodes; its identities are in the structured record.
- The complete documentation checks are not green: five retained Chinese design/plan sources lack English pairs, two have hard-wrapped prose, and the upstream repository-reference rule rejects the exact commit retained for this source baseline. The original design and exact pin are preserved; new package documentation, bilingual operations and README structure checks pass.
- The standard upstream recorded-session corpus and complete CI matrix were not rerun for this local delivery. Real model calls, local file effects, domain integration tests and assembled browser acceptance are recorded separately above.

Start and recovery instructions are in the [pilot guide](../operations/ai-rd-pilot.md). The second phase remains the original automation and enterprise-integration backlog.
