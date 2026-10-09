# AI R&D workbench: local pilot guide

English | [中文](ai-rd-pilot.zh.md)

This tutorial starts the workbench on a trusted local machine and walks a version through its main workflow. One installation owns one project.

<a id="start"></a>
## 1. Start the workbench

On macOS, double-click [启动研发工作台.command](../../启动研发工作台.command) in Finder at the checkout root. The script checks Node, prepares missing dependencies or build outputs, starts the workbench through the existing launcher, and opens the browser. Keep the terminal window open; press Ctrl+C to stop the server. Subsequent launches verify and reuse a service started by the same script; another program occupying the port causes an error.

Logs are stored in the Harness home as `launcher-<port>.log` and include the private bootstrap URL. After changing source, stop the server and run `AI_RD_REBUILD=1 ./启动研发工作台.command` to rebuild. `AI_RD_OPEN_BROWSER=0` disables automatic browser opening.

Use Node 22.23.1 or a compatible version allowed by the root manifest, and the pinned pnpm 11.7.0. Run these commands from this checkout. The complete build includes the upstream host and browser; reserve sufficient memory for the first build.

```sh
pnpm install --frozen-lockfile
NODE_OPTIONS=--max-old-space-size=12288 pnpm run build:rd
pnpm run dev:rd
```

Open the private bootstrap URL printed by the terminal. The server listens on `http://127.0.0.1:3091`; `AI_RD_PORT` changes the port. Keep the bootstrap token private. The launcher uses the official CLI to create an `ai-rd` profile and link the local bundle.

The default home is `.local/harness-home`. An explicit `DSH_HOME` selects another home. Workflow state lives in `rd/workflow.sqlite`; Harness owns the session log, model settings and credentials. This directory is ignored by Git.

<a id="members"></a>
## 2. Create members and choose a model

On first use, create a local administrator with a password of at least 12 characters. The administrator adds product, developer and tester accounts. Each member signs in with their own account; the server owns roles. Use Harness settings to configure an available model and credentials.

This checkout includes an isolated acceptance project. Its test-only accounts are stored in `.local/pilot-access.json` with private file permissions. They are local fixtures, not enterprise identities. Do not publish that file.

The local administrator uses the file's top-level `username` and matching `password`; `members` contains separate product, developer and tester accounts. The existing-project login page requires an existing account and cannot create a member. Invalid credentials retain the inputs and ask the member to check them; sessions expire after 12 hours and require another sign-in.

<a id="workflow"></a>
## 3. Complete one version

The stage strip changes what you view. Only explicit business actions advance the workflow. Keep the AI conversation visible and use the adjacent nodes, artifacts and activity panels.

1. Create a version. Discuss a requirement with AI, edit the structured draft, then save it into the requirement pool or the current version. Requirement review and version membership are separate actions.
2. Record impact analysis and technical design. Developers review the technical proposal, testers review cases, and product reviews interaction. Security review may be marked not applicable with a reason. Product freezes the reviewed scope. Revising technical evidence reopens its review.
3. Create a development task. Its owner registers an absolute local Git checkout and its current branch, then binds that workspace. The first AI development session requires a clean checkout. Select the task explicitly before starting its development conversation.
4. Let AI read and edit the selected source. Existing files must be read before writing; external edits reject replacement. Review the diff and run explicit npm test/build/lint checks. Stop and resume remain available; stopping does not mark a task complete.
5. Review and commit the candidate in your terminal. The platform does not commit or push. Complete the task, then record self-test, code review, CI and integration evidence with the same full commit SHA. Submission requires that exact clean HEAD, build reference, environment and self-test report.
6. Testers record cases and defects. Failed testing returns development. Record the fix commit, renew candidate reviews and submit a new batch. Retest defects on the new batch; old results do not transfer. Test exit requires passed cases and closed defects. Product records UAT separately; rejected UAT returns development for a new batch.
7. Product approves release readiness. Record real externally produced artifacts, gray release, analysis, full release and verification. The platform only records evidence; it never deploys. Add outcome analysis, a follow-up requirement, retrospective and knowledge before closure. Closed versions cannot resume release.

<a id="changes"></a>
## 4. Handle a scope change

Use the bottom change action to provide new requirement content, acceptance criteria and impact nodes. Pending changes pause related writers. Approval retains old baselines and artifacts, reopens affected reviews and downstream delivery, and pauses tasks. Unaffected parallel reviews remain. Re-review and freeze the new baseline, then explicitly bind the task workspace again. Rejection leaves the original business state intact.

<a id="recovery"></a>
## Recovery reference

Errors remain visible inside the active dialog. Review current state before retrying an operation.

- Revision conflict: refresh, inspect the latest document and retry. An ambiguous network failure retains its command key so a retry cannot duplicate a committed action.
- Model error: correct the Harness model configuration and send again. A model failure cannot approve a business step.
- Workspace busy or HEAD changed: stop the current run, inspect changes, register the current checkout facts and bind the task again. No automatic reset or cleanup occurs.
- Restart: persisted records and Harness conversations remain; unsaved source files remain in their checkout. Reconnect, sign in if needed and explicitly continue. Earlier baseline sessions remain in Harness session history.
- Backup: stop the host and copy the entire Harness home. For a running database, use SQLite backup support instead of copying only its main file while WAL is active.

<a id="limits"></a>
## Pilot limits

This is a trusted local pilot. Business roles do not isolate hostile users with filesystem or standard Harness administrator access. One candidate represents one repository. Enterprise SSO, PMP, Gerrit, Jenkins, remote execution and automatic release remain phase-two work. See the [acceptance record](../acceptance/phase-1.md) for verified and unverified surfaces.

AI-authored commits use one `[AI-Generated]` marker in the commit body. New Java/Kotlin source follows the user-required author, date, purpose and email header. Methods and fields receive concise purpose comments.
