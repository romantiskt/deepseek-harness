# AI Native 研发流程两阶段实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 用户已授权“开始实施”。一期功能已在当前仓库实施并完成本地试运行；二期保持待办。下方任务步骤保留原始拆分，实际交付与命令调整见实施对照。

**Goal:** 分两期建设研发工作台：一期交付可实际试跑的主线框架，二期补齐各环节的 AI 专项能力、团队协作与系统自动化。

**Architecture:** 以 DeepSeek Harness 源码为底座，通过自定义 bundle / profile、Host 业务插件与 Client 工作台插件扩展。业务数据和状态由独立领域模块持久化，Harness 承担会话和代码执行；界面按钮与 AI 业务工具调用同一套受角色和状态约束的命令。

**Tech Stack:** TypeScript、Cordis、Harness 原有 React Client 与样式体系、SQLite、Vitest；沿用上游构建与浏览器验证方式。本轮读取的上游 `package.json` 要求 Node `^22.19.0 || >=24.0.0`、`pnpm@11.7.0`；P1-01 检出时核对并锁定具体上游提交，避免使用浮动依赖。

**Spec:** [V2 设计方案](/Users/wangyang/ai/ai_deepseek_harness/docs/design/2026-10-03-ai-native-rd-direction-v2.md)；[选定设计图](/Users/wangyang/ai/ai_deepseek_harness/output/imagegen/04-version-ai-primary-v2.png)；[用户完整流程图](/Users/wangyang/ai/ai_deepseek_harness/docs/design/references/2026-10-03-user-rd-workflow.png)。

日期：2026-10-03。工作目录：`/Users/wangyang/ai/ai_deepseek_harness`。本轮已核查：目录目前只有设计文档与图片，尚无 Harness 源码、Git 仓库或业务实现。

## Global Constraints

- 页面保留六阶段：需求与立项、设计与评审、开发与 Review、测试与验收、发布与灰度、运营反馈与沉淀；31 个节点按当前阶段展开。
- 左侧导航约 180px；业务区默认 AI 对话约 60%、任务与产物约 40%；支持调整宽度、专注对话和常驻多行输入。
- 业务记录必须持久化；浏览阶段与实际业务阶段分开；AI 执行状态与业务状态分开。
- 需求评审、方案并行评审、范围冻结、代码 Review、测试准出、UAT、发布与复盘结论分别记录。
- 工作区显式选择，保留既有未提交改动；同一目录同一时刻只允许一个写任务；执行中不直接切换目录。
- 提测批次关联需求修订、提交、构建制品、环境和自测；旧包测试结果不得自动继承到新包。
- 变更可从任意阶段提出，只使受影响的评审与验证待复核，保留旧基线和无关已完成记录。
- 演示数据、模拟执行和真实业务数据分开标识；没有模型、连接器或执行证据时明确未完成。
- 一期是单机执行端、小团队试用范围，具备真实成员身份和最小产品 / 开发 / 测试角色校验；企业 SSO、跨机器执行端管理放到二期。角色切换演示不能替代权限验收。
- 代码提交每次使用一个 AI 度量标记；主要由 Agent 实现时使用 `[AI-Generated]`。评审人字段只填写实际参与者。所有新增方法和字段添加简明用途注释；新增 Java / Kotlin 文件按用户指定模板填写类描述、作者、当日日期和邮箱。

## 一期实施对照（2026-10-03）

当前分支 `feat/ai-rd-mainline`。使用说明见 [试运行手册](../../operations/ai-rd-pilot.zh.md)，证据与未通过项见 [一期验收记录](../../acceptance/phase-1.zh.md)。这里的完成指本地主线可用，不代表生产系统接入或完整上游 CI 全绿。

| 任务 | 实施结果 | 主要证据 |
|---|---|---|
| P1-01 上游接入 | 已完成；官方源码、独立 profile、启动脚本 | Host / Client / Web 完整构建及实际启动 |
| P1-02 业务底座 | 已完成；SQLite、身份权限、幂等与修订 | 持久化、越权与并发修订测试 |
| P1-03 工作台 | 已完成；突出 AI 区域、六阶段、节点与产物 | 装配后浏览器操作与布局检查 |
| P1-04 需求版本 | 已完成；需求修订、入版与范围 | 实际草稿保存、版本与需求评审 |
| P1-05 真实 AI | 已完成；Harness 会话、上下文、草稿工具 | 真实 DeepSeek 调用及无密钥录制回放 |
| P1-06 评审冻结 | 已完成；并行评审、材料关联、基线 | B1 / B2；修改技术方案必须重审 |
| P1-07 本地开发 | 已完成；任务与工作区、受限文件工具、差异与检查 | 实际 AI 改动和 npm 测试；工作区切换回归 |
| P1-08 测试验收 | 已完成；提测批次、缺陷回流、新批次回归、独立 UAT | 一次真实失败、AI 修复、再次提测通过 |
| P1-09 发布复盘 | 已完成记录框架；外部操作仍由人负责 | 本机隔离制品分发、复盘、知识与回流需求 |
| P1-10 需求变更 | 已完成；审批、旧资料保留、重审与执行暂停 | 开发中批准、测试中驳回、变更后重冻结 |
| P1-11 联调试运行 | 已完成本地验收；保留明确外部限制 | 33 项定向测试、1 项回放集成、31/31 节点实际复验 |

实施调整：本期所有业务结构使用一个尚未发布的 schema-v1 项目聚合，不按功能重复建立迁移；代价是项目级乐观冲突更保守。命令实现统一为认证后的 `execute`，领域测试合并在所属包；集成测试使用 `pnpm run test:rd:integration`。候选一次对应一个仓库。共同接口、插件装配和使用文档以一个原子提交交付，避免阶段间存在不能构建的版本。

## Review Focus

1. **旧会话或旧产物卡写入新对象**：命令绑定对象与修订，切换上下文后旧卡不能修改当前需求；由 P1-05 验证。
2. **重复点击、重试与刷新**：同一幂等命令只执行一次，重启后数据与历史可恢复；由 P1-02、P1-11 验证。
3. **冒用评审身份或越权跨项目操作**：操作者来自可信服务端会话，前端或 AI 不能指定任意审批人；由 P1-02、P1-06 验证。
4. **脏工作区、断线或并发写入**：不覆盖原改动，不切错目录，不把中断记为成功；由 P1-07 验证。
5. **新需求 / 新包沿用旧结论**：重新提测和基线变更保留旧记录，受影响结论必须重新确认；由 P1-08、P1-10 验证。

---

## 一、两期边界

**第一期：主线框架可用。** 六阶段、31 节点都具备真实的记录、责任人、状态和产物引用。一条需求可以从对话创建开始，经过入版、评审、本地开发、提测与测试，继续录入外部发布和复盘结果，回流下一版本。复杂环节先用人工操作和真实证据录入完成，不先构建每个环节的专用自动化。

**第二期：AI 能力与自动化深化。** 在一期稳定的数据和操作接口上，补全方案分析、代码审查、CI、自动化测试、发布灰度、知识沉淀与外部平台连接，以及多人、多机器运行所需的能力。

| 能力 | 第一期：主线框架 | 第二期：深入能力 |
|---|---|---|
| 工作台 | 六阶段导航、节点任务、60% AI 对话、产物区、我的待办 | 多项目协作优化、订阅与更丰富的角色视图 |
| AI | 真实对话、需求草稿、明确上下文、产物卡、基本业务工具 | 各阶段专用能力、材料理解、风险分析、复杂任务编排 |
| 需求与版本 | CRUD、修订、入版、版本范围和负责人 | 外部需求导入与同步、去重和优先级建议 |
| 评审 | 人工结论、并行评审、必需项检查、冻结基线 | AI 技术影响分析、方案 / 用例辅助评审 |
| 开发 | 一台执行端、工作区 / 分支选择、复用 Harness 修改与本地检查 | 多执行端、工作区管理、开发任务自动拆分、增强 Review |
| CR / CI | 关联真实 CR 链接、检查报告与候选提交 | Gerrit / GitHub、Jenkins 等回调与自动收集 |
| 测试 | 人工用例、结果、缺陷回流、重提测、独立 UAT | 自动化测试执行、日志分析与缺陷归因 |
| 发布 / 灰度 | 发布准入、外部操作记录、制品与环境、验证 / 回滚记录 | 自动构建发布、灰度观测与阈值控制、受控回滚 |
| 复盘 / 沉淀 | 人工复盘、知识条目、改进项回流需求池 | 自动生成复盘、知识检索与经营 / 工程指标关联 |
| 需求变更 | 人工标注影响、审批、修订与受影响节点重开 | AI 联合代码、文档、用例和排期分析影响 |

**一期允许保留人工步骤，不允许用空页面、固定成功动画或演示数据代替真实流转。** 没有外部 CI / 发布证据时，节点保持待完成；不能因为一期未接连接器而默认通过。

## 二、文件与模块边界

以下是待创建的路径，不代表当前目录已有代码。所有业务新增尽量集中在扩展包；Host 服务、Client 展示通过上游公开插件契约接入，具体上游装配点在 P1-01 锁定提交后记录。

| 拟新增目录 / 文件 | 职责 |
|---|---|
| `packages/rd/contracts/src/types.ts`、`commands.ts` | 共享业务类型、命令与查询契约；浏览器只依赖类型和公开传输契约 |
| `packages/rd/workflow/src/index.ts`、`repository.ts`、`members.ts`、`access-policy.ts` | 业务服务注册、SQLite 事务与查询、最小成员登录与服务端角色校验 |
| `packages/rd/workflow/src/workflow-template.ts`、`workflow-engine.ts` | 六阶段 31 节点模板、固定流转规则、准入与完成判定 |
| `packages/rd/workflow/src/requirements.ts`、`versions.ts`、`reviews.ts` | 需求修订、版本范围与并行评审 |
| `packages/rd/workflow/src/deliveries.ts`、`quality.ts`、`release-records.ts`、`changes.ts` | 提测、测试 / UAT、发布复盘记录、需求变更 |
| `packages/rd/workflow/migrations/` | 按任务编号分配迁移文件；数据升级与索引 |
| `packages/rd/runtime/src/index.ts`、`sessions.ts`、`workflow-tools.ts`、`workspaces.ts` | Harness 会话关联、业务工具、选定工作区执行与状态回传 |
| `packages/client/rd-workbench/src/client/` | 工作台注册、阶段导航、需求 / 评审 / 开发 / 测试视图、产物卡与上下文联动 |
| `packages/bundle/rd-workbench/package.json`、`cordis.patch.yml` | 自定义 `ai-rd` profile 所使用的扩展 bundle |
| `packages/rd/*/tests/`、`packages/client/rd-workbench/tests/` | 领域行为、执行边界与组件交互验证 |
| `tests/rd/mainline.e2e.spec.ts`、`docs/operations/ai-rd-pilot.md` | 主线集成场景与真实试运行操作说明 |

Client 使用上游 React、Slots、会话展示和语义样式变量，不另起第二套聊天引擎。SQLite 业务库与 Harness 会话库各自负责自己的数据，使用 ID 关联；不从聊天文字反推正式业务状态。

基础契约在 P1-02 定义，后续任务只能扩充业务命令类型，不自行建立另一套对象标识或权限路径：

- `StageId` 固定为 `requirements | design | development | testing | release | feedback`，`NodeId` 为 `01`—`31`。
- `WorkflowScope`：`projectId` 必填；`versionId`、`requirementId`、`stageId`、`nodeId`、`submissionId` 按当前场景选填；组合必须属于同一项目与业务链。
- `AuthActor`：服务端会话中的 `memberId`、项目成员关系与角色。客户端载荷不接受自由填写的操作者身份。
- `CommandEnvelope<T>`：`commandId`（幂等键）、`scope`、目标 `expectedRevision`、`payload: T`。
- `CommandReceipt`：`commandId`、`status: applied | replayed | rejected`、`entityId`、`revision`、`artifactIds`、可选 `errorCode`。同一键不同载荷拒绝执行。
- `dispatch<T extends WorkflowCommand>(command: CommandEnvelope<T>, actor: AuthActor): Promise<CommandReceipt>`：统一写入口；多对象修改在同一事务内完成。
- `getWorkbench(scope: WorkflowScope, actor: AuthActor): Promise<WorkbenchSnapshot>`：返回业务状态、当前可用动作、任务和产物引用；不包含未经授权的项目数据。

## 三、第一期任务清单

全部为一期必需任务。每项任务的交付包含功能、必要行为验证和对应操作说明；不把单独建空文件作为交付。

| 编号 | 工作包 | 主要交付 | 依赖 |
|---|---|---|---|
| P1-01 | Harness 底座与扩展入口 | 固定上游提交、可启动的研发工作台路由、插件装配与运行说明 | 无 |
| P1-02 | 业务数据与流程核心 | 项目成员、角色、持久化、六阶段 / 31 节点、命令校验与历史 | P1-01 |
| P1-03 | 工作台主界面 | 对话 60% / 产物 40%、六阶段导航、节点树、我的待办 | P1-02 |
| P1-04 | 需求池与版本 | 需求文档、修订、入版、范围清单、负责人 | P1-02、P1-03 |
| P1-05 | AI 对话主链路 | 真实模型对话、上下文绑定、需求草稿卡、保存与入版工具 | P1-04 |
| P1-06 | 评审与范围冻结 | 需求评审、方案并行评审、补充 / 驳回、结论与冻结快照 | P1-04、P1-05 |
| P1-07 | 开发任务与本地工作区 | 任务、工作区 / 分支绑定、真实 Harness 修改、差异与本地检查 | P1-06 |
| P1-08 | 提测、测试与验收 | 提测批次、人工测试、缺陷回流、回归与独立 UAT | P1-07 |
| P1-09 | 发布与复盘记录 | 发布准入、外部发布证据、灰度 / 验证记录、复盘与需求回流 | P1-08 |
| P1-10 | 跨阶段需求变更 | 影响范围、人工审批、新基线、受影响节点重开 | P1-06、P1-08、P1-09 |
| P1-11 | 主线联调与试运行 | 完整试用数据链、错误恢复、操作说明与一期验收记录 | P1-01—P1-10 |

### Task 1: P1-01 Harness 底座与扩展入口

**文件：** 创建 `packages/bundle/rd-workbench/`、`packages/client/rd-workbench/src/client/apply.ts`、`docs/operations/upstream-baseline.md`；上游根配置修改点按锁定提交登记。

**接口：** 产出可启动的 `ai-rd` profile、研发工作台路由和复用原有会话能力的装配入口。

- 原计划步骤：在临时检出目录选择官方提交，记录 SHA、版本、Node / pnpm 要求和原始启动结果；保留当前全部 `docs/` 与 `output/` 后再建立当前目录的源码仓库，不对非空目录直接覆盖克隆。
- 原计划步骤：按该提交的插件与 Client 规范接入研发入口，复用原有模型设置、连接与会话展示能力；业务成员身份单独建设，不将共享 Harness 进程令牌等同于每位用户的身份。新增 profile 不影响原有启动方式。
- 原计划步骤：记录本项目实际启动、构建、定向测试命令和用户 AGENTS 补充约束；显示模型未配置时的真实提示。
- 原计划步骤：验证从干净安装到研发入口可打开，刷新路由仍正常，原有 Harness 会话入口可使用。

**验收：** 在当前项目目录按操作文档能启动一个真实 Harness 研发扩展入口；此任务不计为业务流程已完成。

### Task 2: P1-02 业务数据与流程核心

**文件：** 新增 `contracts/src/types.ts`、`contracts/src/commands.ts`、`workflow/src/{repository,members,access-policy,workflow-template,workflow-engine}.ts`、`workflow/migrations/002-core.sql`、`workflow/tests/{persistence,guards}.spec.ts`（包路径见模块表）。

**接口：** 实现上文 `dispatch()`、`getWorkbench()`；定义 `WorkbenchSnapshot`、项目成员、角色、节点实例、产物引用、活动记录和 `WorkflowCommand` 联合类型。先提供 `artifact.createRevision`、`node.attachArtifact`、`node.recordOutcome` 通用命令，后者仅允许模板标为普通记录的节点；审批与业务准入使用专用命令。

- 原计划步骤：添加失败用例：`replaysSameCommandOnce`、`rejectsReusedKeyWithDifferentPayload`、`rejectsStaleRevision`、`rejectsCrossProjectActor`、`restoresAfterRestart`；断言不产生重复实体或多余活动记录。
- 原计划步骤：运行 `pnpm exec vitest run packages/rd/workflow/tests/persistence.spec.ts packages/rd/workflow/tests/guards.spec.ts`，确认上述行为尚未实现。
- 原计划步骤：实现 SQLite 事务、最小成员登录与项目角色校验：一期由管理员创建本地成员账户，登录后由服务端会话绑定成员，不允许客户端通过切换角色字段冒用身份；凭据安全散列，不写入模型上下文。建立六阶段 / 31 节点模板和统一写入口。
- 原计划步骤：区分节点必需结果与可选分支：节点 10 可经责任人说明不适用；节点 27 的发布验证必需，回滚 / 热修复仅在实际发生时记录，不要求每个版本都回滚一次。审批不能通过通用“标记完成”绕过，检查 / CI / 外部操作节点必须关联证据。
- 原计划步骤：重跑测试，确认幂等、权限、修订冲突与重启恢复全部通过。

**验收：** 数据真实保存；每次流转有操作者、对象、前后状态、时间与产物引用。未经授权者不能伪造角色或审批。

### Task 3: P1-03 工作台主界面

**文件：** 新增 `packages/client/rd-workbench/src/client/{workbench,stage-navigation,node-panel}.tsx`、`workbench.module.css`、`workbench-store.ts`、语言字典和 `tests/workbench.spec.tsx`。

**接口：** 消费 `WorkbenchSnapshot`；产出 `WorkbenchSelection` 与上下文变更回调，布局状态仅保存面板宽度、选择和滚动位置。

- 原计划步骤：实现 V2 布局：左导航、六阶段、AI 主区、任务 / 产物 / 记录标签、变更入口、我的待办；加载、空列表、失败状态均有明确反馈。
- 原计划步骤：实现阶段浏览与节点选择，不修改真实流程阶段；新增 `selectingHistoryDoesNotAdvanceWorkflow` 和 `focusModePreservesDraft` 交互用例。
- 原计划步骤：验证面板调整、专注对话、长需求标题、待办跳转以及刷新后恢复；在 1440px 与较窄桌面视口人工检查输入框和主要操作可见。
- 原计划步骤：运行 `pnpm exec vitest run packages/client/rd-workbench/tests/workbench.spec.tsx`，并按锁定上游的 Client 检查要求验证装配后的页面。

**验收：** 可使用的工作台布局与选定图一致，AI 区默认占业务宽度约 60%；所有可点击主入口有真实路由或明确空状态。

### Task 4: P1-04 需求池与版本

**文件：** 新增 `workflow/src/{requirements,versions}.ts`、`migrations/004-requirements.sql`、`workflow/tests/requirements.spec.ts`；Client 新增需求与版本视图。

**接口：** `WorkflowCommand` 增加 `requirement.create`、`requirement.revise`、`version.create`、`version.assignRequirement`；`RequirementRevision` 保存正文、验收标准、负责人及来源。

- 原计划步骤：添加 `persistsRequirementRevision`、`assignsOneActiveVersion`、`rejectsFrozenScopeMutation`；运行 `pnpm exec vitest run packages/rd/workflow/tests/requirements.spec.ts` 确认缺失行为。
- 原计划步骤：实现需求字段、草稿 / 正式需求区分、修订历史、版本目标、计划日期、负责人和候选范围列表。
- 原计划步骤：支持入版候选与正式冻结范围分开；已冻结范围变动只能走需求变更，不能通过普通编辑绕过。
- 原计划步骤：重跑测试，并在页面创建两条需求加入同一版本，刷新后检查归属和正文。

**验收：** 产品可以不依赖模型直接完成需求与版本管理；AI 后续调用的是同一套功能。

### Task 5: P1-05 AI 对话主链路

**文件：** 新增 `packages/rd/runtime/src/{sessions,workflow-tools}.ts`、`tests/session-scope.spec.ts`；Client 新增 `conversation-context.ts`、需求产物卡与 `tests/artifact-actions.spec.tsx`。

**接口：** `ensureSession(scope: WorkflowScope, actor: AuthActor): Promise<{ sessionId: string }>`；工具调用 P1-02 `dispatch()`，使用 P1-04 命令。产物卡保存固定 `scope`、`sourceRevision` 和 `artifactId`。

- 原计划步骤：添加 `keepsOldCardBoundToOriginalScope`、`rejectsStaleArtifactAction`、`doesNotTreatAssistantTextAsApproval`，分别验证跨需求切换、旧修订和伪审批文本。
- 原计划步骤：接入真实 Harness 会话流、历史、停止 / 继续、上下文标签；需求对话仅开放业务读取与草稿能力，不因默认工作目录获得任意代码写权限。
- 原计划步骤：实现需求草稿生成、编辑、查看差异、保存并入版；工具执行结果与业务数据库记录双向关联。
- 原计划步骤：运行会话与产物卡定向测试；随后用已配置的模型完成一次真实需求创建并保存。没有凭据时记录此验收未完成，不能用回放代替。

**验收：** 一句需求能经真实对话形成文档并入版；刷新保留记录，切换上下文不串需求。新会话无需反复粘贴已有材料。

### Task 6: P1-06 评审与范围冻结

**文件：** 新增 `workflow/src/reviews.ts`、`migrations/006-reviews.sql`、`tests/reviews.spec.ts`；Client 新增评审节点和结论表单。

**接口：** 增加 `review.open`、`review.recordDecision`、`review.setApplicability`、`baseline.freeze` 命令；`ReviewRound` 绑定材料修订及必需评审人，`Baseline` 保存需求 / 方案 / 用例 / 设计引用。

- 原计划步骤：添加 `blocksFreezeUntilRequiredReviewsPass`、`recordsNotApplicableWithReason`、`rejectsReviewerForgery`、`doesNotCarryApprovalAcrossRevisions`。
- 原计划步骤：实现节点 03 的需求评审，以及节点 07—10 的并行评审；通过、需补充和不适用均保留责任人及理由。
- 原计划步骤：节点 11 仅在必需评审通过、阻塞意见解决后冻结；页面显示缺失项并允许发起复审。
- 原计划步骤：运行 `pnpm exec vitest run packages/rd/workflow/tests/reviews.spec.ts`；用不同项目成员分别提交结论，核对数据库与页面一致。

**验收：** 可以完成一轮真实角色评审；未通过或缺结论时无法启动基于该范围的开发。

### Task 7: P1-07 开发任务与本地工作区

**文件：** 新增 `packages/rd/runtime/src/workspaces.ts`、`tests/workspace-execution.spec.ts`、业务任务迁移；Client 新增工作区选择与开发任务视图。

**接口：** 新增 `development.createTask`、`development.recordCheck` 和 `development.recordCodeReview` 命令；`startDevelopment({ taskId, baselineId, workspaceId, branch }, actor): Promise<{ runId, sessionId }>`。输入对象均为已存在且可访问的 ID，`ExecutionRecord` 记录运行状态、工作区、基准提交、实际变更与检查结果。

- 原计划步骤：添加 `writesOnlySelectedWorkspace`、`preservesDirtyFiles`、`rejectsConcurrentWriter`、`stopsWithoutMarkingComplete`；使用隔离测试仓库，禁止测试修改真实工作仓库。
- 原计划步骤：复用 Harness 工作区与执行能力，明确选择当前执行端的仓库、分支；未冻结需求拒绝执行，运行中切换工作区需先停止。
- 原计划步骤：展示计划、实际差异、本地检查、停止 / 继续；记录 CR 链接和 CI 结果作为本轮候选提交的证据。一期不自动 push、创建外部 CR 或触发 Jenkins。
- 原计划步骤：运行定向测试，并让真实 Harness 在选定的试用仓库完成一个最小改动和本地检查，核对另一工作区未被修改。

**验收：** 确实在用户选中的工作区产生可检查的代码变更；执行状态、开发完成、提测三个动作分开。

### Task 8: P1-08 提测、测试与验收

**文件：** 新增 `workflow/src/{deliveries,quality}.ts`、`migrations/008-quality.sql`、`tests/quality.spec.ts`；Client 新增提测单、用例结果、缺陷和 UAT 视图。

**接口：** 增加 `submission.create`、`submission.accept`、`test.recordResult`、`defect.create`、`defect.recordVerification`、`quality.exit`、`uat.recordDecision`；`TestSubmission` 固定基线、提交、制品标识、环境和自测报告。

- 原计划步骤：添加 `rejectsIncompleteSubmission`、`doesNotReuseOldBuildResults`、`requiresRetestBeforeDefectClose`、`keepsUatSeparateFromTestExit`。
- 原计划步骤：实现节点 17 的提测检查与接收、18—20 的人工用例 / 缺陷 / 测试准出，21 的业务验收；构建包和报告先支持真实文件或可访问链接。
- 原计划步骤：缺陷回流到开发任务，修复后新建批次；缺失必测结果或存在阻塞缺陷不能通过测试准出。
- 原计划步骤：运行 `pnpm exec vitest run packages/rd/workflow/tests/quality.spec.ts`；演练失败、修复、再次提测、回归、测试准出和产品 UAT。

**验收：** 测试人员能基于确切的代码与包进行人工测试，完整经历一次缺陷回流；开发自测不能代替测试或 UAT。

### Task 9: P1-09 发布与复盘记录

**文件：** 新增 `workflow/src/release-records.ts`、`migrations/009-release-feedback.sql`、`tests/release-feedback.spec.ts`；Client 使用通用节点表单与产物视图。

**接口：** 增加 `release.recordDecision`、`release.attachEvidence`、`retrospective.record`、`knowledge.create`、`feedback.createRequirement`；发布记录关联候选制品与环境，知识条目保留来源版本。

- 原计划步骤：添加 `doesNotMarkReleasedWithoutEvidence`、`bindsRollbackToOriginalRelease`、`returnsFeedbackToBacklogWithLineage`。
- 原计划步骤：为节点 22—27 提供人工准入、构建 / 灰度 / 全量 / 验证 / 回滚结果记录；外部操作由人实际完成，平台录入结论和证据，不调用发布系统。
- 原计划步骤：为节点 28—31 提供指标或反馈附件、复盘、知识条目和回流需求；必要时把回流需求加入下一版本。
- 原计划步骤：运行定向测试；使用隔离试用版本核对记录与引用。无实际发布证据的试用只能验证录入与流转，不能宣称生产发布已验证。

**验收：** 后两个阶段有可保存、可追溯的人工工作路径，能将一条改进项变成下一轮需求；不只是占位页。

### Task 10: P1-10 跨阶段需求变更

**文件：** 新增 `workflow/src/changes.ts`、`migrations/010-changes.sql`、`tests/changes.spec.ts`；Client 新增变更表单与影响清单。

**接口：** 增加 `change.propose`、`change.recordImpact`、`change.decide`、`change.apply`；`ChangeRequest` 保存原基线、变更正文、人工标注的影响对象、审批和新基线引用。

- 原计划步骤：添加 `reopensOnlyImpactedNodes`、`retainsOriginalEvidence`、`invalidatesAffectedApproval`、`pausesAffectedRun`；并验证驳回后原状态不变。
- 原计划步骤：实现任意阶段发起、人工标注影响、审批和事务性更新；直接关联对象自动列出，代码语义和跨系统影响分析放到二期。
- 原计划步骤：更新受影响的 PRD / 方案 / 用例修订，相关评审与验证待复核；保留无关完成状态。运行中的相关写任务收到失效信号后停止继续修改。
- 原计划步骤：运行定向测试；在开发中与测试中各发起一次变更，验证回到正确节点及历史可查。

**验收：** 变更不会静默覆盖已评审基线，也不会无差别清空整个版本进度。

### Task 11: P1-11 主线联调与试运行

**文件：** 新增 `tests/rd/mainline.e2e.spec.ts`、`docs/operations/ai-rd-pilot.md`、`docs/acceptance/phase-1.md`。

**接口：** 组合前面各工作包的真实命令、会话与界面，不建立验收专用旁路接口。

- 原计划步骤：添加主线集成场景 `completesMainlineAndReturnsFeedback`，覆盖节点 01—31 的基础人工或执行记录；测试数据明确标为隔离样例。
- 原计划步骤：补充刷新 / 重启恢复、重复点击、权限拒绝、AI 失败、工作区占用、包变化、需求变更与重试场景；证据分别归属上述任务测试。
- 原计划步骤：运行 `pnpm exec vitest run tests/rd/mainline.e2e.spec.ts`，以及新包定向测试、上游要求的类型 / 插件装配 / Client 检查。
- 原计划步骤：完成一次人工试运行，记录实际需求 ID、版本 ID、模型会话、提交、提测批次、测试与 UAT 结果；外部发布证据未具备时明确停止的位置。
- 原计划步骤：将通过项、未通过项和外部条件写入验收记录。只有主线功能与真实模型 / 本地执行验证齐全，才标记一期完成。

**验收：** 可按文档复现一期主线；测试回放、真实模型调用、本地代码执行和外部发布分别有清楚结论。

### 一期提交约定

各任务形成独立可审查变更，必要时拆为数个小提交；完成相应行为检查后再提交。Agent 代提交时，提交正文包含唯一 `[AI-Generated]` 标记，不混入无关人工改动。计划中的测试命令是后续创建代码后的验证步骤，本次未执行这些不存在的测试。

## 四、一期执行顺序与完成条件

推荐依次交付：**P1-01—03 可运行的主线工作台 → P1-04—06 对话需求与评审 → P1-07—08 开发与测试 → P1-09—10 发布记录 / 回流 / 变更 → P1-11 联调验收**。这是同一期内的工作包顺序，不另设额外交付期。

第一期验收至少包括以下一条完整业务记录链：

1. 产品通过真实 AI 对话形成需求并进入版本；数据重启后仍存在。
2. 需求与适用方案评审完成，未通过时无法开发；冻结快照可查。
3. 开发选择本地工作区，让 Harness 完成一项真实改动和检查。
4. 提测固定基线、提交、制品和环境；测试提出缺陷并经历修复回归；产品独立确认 UAT。
5. 发布和反馈节点能够录入外部操作与证据；复盘改进回流需求池。没有生产发布条件时，以隔离样例验证此功能，不把它算为生产发布验收。
6. 开发或测试期间发生一次需求变更，经过审批后只重开受影响节点。

依赖风险集中在首次 Harness 插件接入、真实模型配置、实际工作区执行和可用测试包；因此 P1-01、P1-05、P1-07 先完成真实能力验证，再扩大界面与功能覆盖。暂不承诺具体工期，避免把这些未知项折算成未经验证的日期。

## 五、第二期任务清单

二期沿用一期 ID、产物和状态接口，按领域逐个深化，不推翻主线框架。以下为可排入版本的工作包；连接具体系统时，在各包开工前依据目标 API 和权限补充实现步骤。

| 编号 | 工作包与范围 | 依赖 | 可检查的完成条件 |
|---|---|---|---|
| P2-01 | 团队与执行端：多人协作、企业登录接入、跨机器工作区登记、执行端离线 / 重连、任务队列 | P1-11 | 两名用户只能使用授权项目和工作区；跨机器任务不串目录，掉线可恢复且不重复执行 |
| P2-02 | 产品与设计 AI：材料理解、需求完善、技术影响分析、方案 / 用例生成、并行评审辅助 | P1-05、P1-06、P1-10 | 产物引用输入材料和修订，建议可编辑；采纳后进入对应评审，缺失事实标明待确认 |
| P2-03 | 开发与集成：任务拆分、增强 AI Review、项目检查配方、Git / Gerrit 或 GitHub、Jenkins / CI 对接 | P1-07、P1-08 | 指定提交的 CR / CI 结果自动回填；失败或旧提交结果不能让新候选进入提测；重试不重复外部写入 |
| P2-04 | 测试智能化：用例生成与评审、配置的自动化测试执行、日志分析、缺陷归因和回归建议 | P1-08、P2-03 | 自动结果固定对应包与环境，失败附执行证据；人工测试和 UAT 结论仍独立 |
| P2-05 | 发布与灰度自动化：正式构建、发布系统连接、灰度指标、全量与回滚 / 热修复 | P1-09、P2-03、P2-04 | 人工准入后才执行发布；灰度门限由项目配置；回滚演练验证恢复结果并保存制品与环境记录 |
| P2-06 | AI 需求变更分析：联合 PRD、代码、依赖、测试和排期形成影响清单，辅助更新材料 | P1-10、P2-02、P2-03 | 分清确认影响与推测影响；责任人批准后才更新基线；未批准不改正式结论或自动续跑受影响任务 |
| P2-07 | 效果与知识沉淀：指标接入、复盘生成、知识检索、案例 / SOP、改进回流与研发度量 | P1-09、P2-03、P2-04 | 指标可追溯真实来源；知识引用版本产物；下一需求保留反馈来源，缺数据时不生成虚假数值 |
| P2-08 | 外部协作与运行保障：按实际工具选择 PMP / 文档 / 通知连接器，权限化写回、失败补偿、备份迁移与运维 | P2-01，及被集成领域任务 | 先选一套真实工具链验证读写；权限、重复回调、断线补偿与恢复演练通过，未配置集成明确不可用 |

二期首先选定团队真实使用的一条工具链做纵向试点。例如使用 Gerrit + Jenkins 时，不同时承诺再建设一套 GitHub 自动化。各外部写操作按项目授权和人工卡点执行。

## 六、31 节点覆盖与任务对应

| 附图节点 | 一期对应任务 | 二期深化 |
|---|---|---|
| 01—02 需求收集、澄清 | P1-04、P1-05 | P2-02、P2-08 |
| 03—04 需求评审、立项排期 | P1-04、P1-06 | P2-02 |
| 05—06 影响分析、方案设计 | P1-02、P1-05、P1-06：文档产物与人工记录 | P2-02 |
| 07—11 并行评审、范围冻结 | P1-06 | P2-02、P2-06 |
| 12—14 拆分、实现、自测 | P1-07 | P2-03 |
| 15—17 CR、CI、联调准入 | P1-07、P1-08：证据关联与准入 | P2-03 |
| 18—21 测试、缺陷、测试准出、UAT | P1-08 | P2-04 |
| 22—27 发布、灰度、验证与处置 | P1-09：外部执行与人工记录 | P2-05 |
| 28—31 分析、复盘、知识与回流 | P1-09：人工记录与回流需求 | P2-07 |
| 跨阶段需求变更 | P1-10 | P2-06 |
| 全程对话、工作台与协作 | P1-02、P1-03、P1-05、P1-11 | P2-01、P2-08 |

## 七、来源与计划自检

- 以用户已选定的 V2 设计和附图为业务依据；本计划将实施拆法更新为“先搭全主线，再深化能力”。
- [官方插件教程](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/index.md)支持通过插件与配置覆盖扩展 Harness。
- [上游包与运行要求](https://github.com/deepseek-ai/deepseek-harness/blob/master/package.json)、[Client 约定](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/AGENTS.md)用于核对技术边界；实际实施须以 P1-01 锁定提交为准。
- 自检：六阶段和 31 节点已映射，所有一期任务均有交付、依赖和验收；真实 AI / 工作区执行留在一期；人工卡点、变更与证据绑定没有推迟到二期；二期集成不作为一期真实能力已具备的承诺。
