# V2 修订设计图生成提示词

日期：2026-10-03。工具：内置 Image Gen。类型：基于用户选择的图 1 与完整流程附图进行单张修订。两张实际图片均通过 referenced_image_paths 传入。

原流程附图已另存到当前项目 docs/design/references，避免仅依赖临时剪贴板路径。

```text
Revise the attached desktop UI design using the user's feedback. Generate ONE final revised UI image, not alternatives, not a collage. Both actual reference images are supplied:
REFERENCE A: /Users/wangyang/ai/ai_deepseek_harness/output/imagegen/01-version-review.png is the SELECTED VISUAL BASE. Preserve its professional light enterprise style, Harness 研发 wordmark, indigo accent, sidebar information architecture, calm typography, version-oriented mental model, and overall high fidelity.
REFERENCE B: /var/folders/5y/cyyz94ds69d3g0zl59hwy1hm0000gn/T/codex-clipboard-b061141c-a210-4a8a-8267-e4982a232029.png is the USER'S BUSINESS WORKFLOW reference. Use it for workflow semantics only, not as a visual style to paste into the app. Do not recreate the dense infographic inside the application.
The user likes A but says the AI conversation region is too weak. Make sustained AI collaboration the DOMINANT PRIMARY WORK SURFACE, while preserving version navigation and visible business progress.
Target canvas: match reference A's aspect ratio, 1487 x 1058 pixels. No device frame, no browser chrome, no external design annotations or presentation board. All UI copy accurate Simplified Chinese; official term Review allowed. Date anchor 2026-10-03, Asia/Shanghai. Tiny footer or subtitle "概念设计 · 示例数据".

Product flow, preserve these hard semantics:
Six main stages: "需求与立项", "设计与评审", "开发与 Review", "测试与验收", "发布与灰度", "运营反馈与沉淀".
Requirements collection/clarification and human requirements review precede version planning. Design includes impact analysis, technical proposal, then PARALLEL reviews of technical plan, test plan/cases, UI/interaction, and conditional security/compliance/performance. Human review conclusion freezes scope before development. Development includes workspace choice, implementation, self-test, human+AI code review, CI, integration readiness. Testing includes execution, defects, test exit, UAT. Release includes admission, artifacts, canary, analysis, full rollout, verification/rollback/hotfix. Feedback includes effect analysis, retrospective, knowledge, next-version planning. A cross-stage change process supports proposal -> impact analysis -> HUMAN approval -> updated PRD/plan/cases/schedule -> impacted stages. Do not depict all 31 nodes simultaneously. Display current stage's handful of relevant tasks, with six-stage navigation above. AI suggestions must not look like completed human approvals.

Visual system:
Light grey-white canvas #F7F8FA, white flat work surfaces, deep ink #182230, muted grey #728095, indigo #4F46E5. Subtle status green/amber and very restrained rose for change management. No gradient glows, no decorative art, no dashboard metrics, no nested cards. Precise alignment, soft 6-8px radii, restrained borders, almost no shadows. Typography 15-16px body, headings 22-28px. Keep all Chinese text sharp and readable.

Layout with strong relative weights:
LEFT NAV width 180px, near-white. Preserve compact logo and "Harness 研发", project selector "视频客户端", nav "我的工作", "需求池", "版本" selected, "工作区", "测试", and bottom "王洋 / 产品负责人". Simple line icons.
MAIN AREA x=200 to 1467. Top header around y=25..93 with breadcrumb "项目 / 视频客户端 / 版本", title "v1.8.0  播放体验优化", current-stage small badge "设计与评审". Right modest text-outline action "发起变更". This is secondary, not the hero CTA.
SIX STAGE RIBBON y=112..199 across all main area. Six evenly spaced steps, short labels can wrap over two lines. Stage 1 complete, stage 2 current, stages 3-6 not started. Exact labels from above. Stage 2 has understated indigo selection background, green completed check for 1. Small subtitle under 2 "并行评审". Other stage colors remain quiet. No extra progress bars or fake percentages.

MAIN WORK AREA y=220..974:
PRIMARY AI CONVERSATION COLUMN on the LEFT, about 735px wide (roughly 60% of working area). It must visibly own the screen. Right task/artifact context column about 505px (40%), separated by thin vertical rule.
Conversation header "AI 协作" with sparkle icon; small muted status "等待你的确认"; top-right tiny expand icon and text "专注对话".
Below header explicit context chips "v1.8.0" "设计与评审" "REQ-024", then faint separator.
Show real conversational depth with four messages and a useful actionable artifact, not a static assistant recommendation:
Message 1, small user avatar, sender "王洋":
"检查这个版本的评审缺口，补齐重试场景的验收标准。"
Message 2, AI icon, sender "AI 研发助手":
"已核对需求与评审记录。技术、UI 评审已通过，测试评审还缺网络恢复场景。"
Under it a small tool-evidence line with check and document icon "已关联需求基线与评审记录".
Message 3, user:
"补充后发起测试方案复审。"
Message 4, AI:
"已生成补充草稿。采纳后将发起测试复审，由测试负责人确认结论。"
Attached directly below the latest AI message ONE refined document artifact card, not nested cards:
Small document icon and heading "验收标准补充草稿" with small tag "待采纳".
Line "REQ-024 · 播放失败后一键重试".
Two lines of content "恢复网络后由用户手动重试；成功后从原播放进度续播，失败时继续保留进度。"
Footer secondary text link "查看差异", and clear indigo primary button "采纳并发起复审".
This is the main primary action of the whole frame.
Bottom persistent LARGE multi-line composer in the conversation column, width nearly the whole column and height about 125px, with placeholder "继续描述需求，或让 AI 推进当前任务…", attachment icon, text "当前：v1.8.0 / 设计与评审", indigo send button. Above composer two small optional prompt suggestions "分析变更影响" and "生成测试用例". The composer must feel first-class and spacious, not a narrow one-line footer widget.

RIGHT SUPPORTING CONTEXT COLUMN:
Header tab strip "流程任务" (selected), "产物", "记录".
Title "设计与评审", subtitle "当前版本 · 3 项需求".
Two simple completed task rows with small step numbers matching user workflow:
"05  技术影响分析" green completed check.
"06  技术方案设计" green completed check.
Below, a group titled "并行评审" with a subtle fork-line or parallel grouping; not a giant flowchart. Four small rows in a single grouped surface:
"07  技术方案评审" green "已通过"
"08  测试方案评审" amber "待补充" (selected row)
"09  UI / 交互评审" green "已通过"
"10  安全 / 性能评审" muted "不适用" with small "按需" tag. Do not make AI decide this.
Then a muted locked row "11  评审结论与范围冻结" with label "待完成".
Selected-task detail beneath a simple divider:
Heading "测试评审意见"
A small avatar "陈晨 · 测试负责人"
Text "请补充断网后恢复场景的验收标准。"
Linked document row "REQ-024 · 验收标准草稿" and text action "打开文档".
At bottom a quiet amber status hint "测试评审待完成，尚未冻结范围". No second enabled prominent approval button.

CROSS-STAGE CHANGE RAIL y=997..1040 across MAIN area only, very subtle pale rose surface and simple arrows:
"需求变更" then "提出 → 影响评估 → 人工审批 → 更新基线 → 返回受影响阶段"
Do not duplicate a giant approval workflow.
Tiny caption "概念设计 · 示例数据 · 2026-10-03".

Render polished intentional spacing. Maintain 735px conversational dominance and full dialogue, sizable persistent composer, contextual action card, and supporting review panel. Avoid compressing AI back into a narrow sidebar. Avoid filling the image with all 31 workflow nodes. Preserve readability and strong hierarchy throughout.
```
