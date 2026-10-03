# 设计图生成提示词

日期：2026-10-03。生成方式：内置 Image Gen。三次独立生成；下方是实际传入工具的完整提示词。每张图为概念界面，目标画布 1440 × 1024。

## 1. version

```text
Create a realistic, production-quality desktop web application UI design. A single focused primary screen, not a feature inventory. No browser chrome, no device frame, no external captions, no multiple screens or collage.
Target dimensions: 1440 x 1024, landscape desktop application. All visible product copy in accurate, crisp Simplified Chinese with occasional meaningful English identifiers. Date anchor: 2026-10-03, Asia/Shanghai. Mark mock data subtly as "设计示例". This is a proposed new AI-native R&D workflow application built on DeepSeek Harness, not an official DeepSeek product. Product wordmark "Harness 研发".
Concept name: "版本指挥台". A version-first team workspace that unifies product, developer, and tester collaboration. The overall required workflow is conversation-created requirement -> requirement added to a version -> joint version requirements review -> developer chooses a workspace to edit code -> test handoff with commit/build/self-test evidence -> tester runs tests and returns defects. This frame focuses ONLY on the VERSION REQUIREMENTS REVIEW moment. Other stages remain visible in a compact workflow ribbon and navigation, not sprawling feature panels.

Visual system: exceptional enterprise product design, calm, precise, airy and highly legible. Warm near-white canvas #F7F8FA, pure white content, deep ink #182230, muted grey #728095, vivid indigo #4F46E5 reserved for primary controls and current stage. Delicate borders #E7E9EF, 8px control radii, almost no shadows. Compact modern line icons. 14-16px body text and a 28px semibold page title, Chinese system sans-serif. Use generous whitespace, group related items with dividers rather than cards inside cards. Full bleed application surface, no floating app-card backdrop, no decorative illustration.

Composition:
1. Left sidebar 204px wide in near-white with wordmark and small modest geometric logo. Project switcher "视频客户端". Navigation: "我的工作", "需求池", "版本" (selected indigo pale band), "工作区", "测试". Bottom small avatar "王洋" and "产品负责人". Thin divider at right edge.
2. Main header from x=236, y=36. Breadcrumb "项目 / 视频客户端 / 版本". Large title "v1.8.0  播放体验优化". Small amber pill "评审中". Subtitle "3 项需求 · 产品、开发、测试共同评审". Right side a primary indigo button "继续评审". Do not show percentage metric cards or generic dashboards.
3. Across content below header, a slim horizontal six-stage progress ribbon: "需求池" then "版本规划" then "需求评审" then "开发" then "提测" then "测试验收". First two complete with discreet check marks, third current in indigo, rest muted.
4. Main work area split: broad 720px review surface left and a quiet 330px contextual AI pane right, separated by a thin vertical line. At top of the review surface a modest tab strip "版本需求" (selected), "评审记录". Section label "本次评审范围", right tiny secondary text action "添加需求". A single table with three generously spaced rows, column headings "需求 / 负责人 / 评审结论".
Rows:
"REQ-024  播放失败后一键重试" / "王洋" / amber "待补充"
"REQ-025  历史记录跨端同步" / "李明" / green "已通过"
"REQ-026  搜索无结果推荐" / "陈晨" / green "已通过".
The first row is selected with a subtle indigo tint and a slim left indicator.
5. Below the table, selected requirement review detail as a spacious document area on the same white surface. Heading "播放失败后一键重试". Below "产品已确认 · 开发已确认 · 测试待确认". A thin rule. Section heading "待解决的评审意见". Single tester comment with small avatar: "请补充断网后恢复场景的验收标准。" Then two short acceptance checklist lines "播放失败时显示重试入口" and "重试成功后恢复到失败前的播放位置". A third amber outlined line "待补充：网络恢复后的处理规则". Secondary text link "打开需求全文". Bottom footer softly tinted amber with text "1 项需求仍待补充，完成后可通过版本评审" and a clearly disabled grey button "通过并进入开发". Make this rule understandable and not alarming.
6. Right AI pane heading with small sparkle "AI 评审助手". Context line "当前：v1.8.0 / REQ-024". A short helpful sentence "发现 1 处验收标准缺口". Body two short lines "建议明确：网络恢复后由用户点击重试，避免自动播放打断操作。". A pale indigo suggested edit block headed "建议补充" with text "恢复网络后，重试按钮可点击；成功后续播，失败时保留原播放进度。". One secondary button "采纳到需求". Below a subtle row "修改会保留修订记录". Most of bottom pane empty to breathe; fixed composer at bottom "继续讨论这个需求…" and send icon.
7. Bottom very small unobtrusive footer "设计示例 · 2026-10-03".

Quality requirements: precise Chinese glyphs, strong alignment, consistent line spacing, all text readable, no clutter, all content fits inside viewport with comfortable padding. One clear primary action. No invented charts, vanity metrics, giant gradient glow, dark sci-fi aesthetics, marketing slogans, or code snippets.
```

## 2. conversation

```text
Create a realistic, production-quality UI design of a single desktop web application screen. Target dimensions 1440 x 1024. No browser chrome, device frame, presentation board, multiple-screen montage or collage. All visible product language must be crisp Simplified Chinese. Date anchor: 2026-10-03, Asia/Shanghai; no older arbitrary dates.
Concept name: "对话需求台". A conversation-first AI-native R&D workspace, proposed extension of the DeepSeek Harness open-source runtime, with product name "Harness 研发". This is a new concept, not a depiction of officially shipped product functionality.
Hard workflow requirements: Product creates requirements by conversation; requirements are structured, saved, and assigned to a selected version; the version undergoes human review by product/development/testing before development starts; developer chooses the actual code workspace; change evidence is handed to testing; testers execute tests and return defects. This single screen should focus on the HERO USE CASE: a product manager converses with AI while a complete structured requirement draft appears alongside, then chooses a version and saves it for later version review. Do not imply saving or adding to a version automatically approves a requirement or starts coding.

Direction: editorial, thoughtful, document-oriented. Warm white #FCFCFA, light warm sidebar #F3F4F1, ink black-green #19312C, quiet teal #167D73 accent, muted #788680, very faint borders. Elegant restrained UI typography, 14-16px body, bold 26px requirement title. Rounded controls 8px, very sparse shadows, no gradient glows, no decorative imagery. Generous whitespace, flat grouped surfaces separated with lines. No dashboard stats. Strong contrast. Different layout and information hierarchy from a version dashboard.

Screen layout:
- Slim 72px left navigation rail with understated wordmark "H" in a rounded square, outline nav icons, teal active chat icon; bottom user avatar.
- Secondary sidebar width 220px, warm light background, top text "视频客户端" project dropdown. Label "需求对话" and a small plus icon. Three conversation rows with titles "播放失败后一键重试" (active), "历史记录跨端同步", "搜索无结果推荐", small secondary metadata "草稿" for active. Lower text navigation links "需求池", "版本", "工作区", "测试". One grouping, not individual cards.
- Chat panel from x=320 to x=830, white. Header "和 AI 一起把需求说清楚", small subheading "需求尚未保存". Ample whitespace.
Conversation, clear distinguishable sender names and text with minimal bubble styling:
"王洋" : "我想让播放失败的用户可以一键重试，并继续刚才的播放进度。"
"AI 产品助手" : "已整理需求草稿。网络恢复后，应该自动重试还是由用户点击？"
"王洋" : "用户手动点击。失败时保留播放进度，成功后继续播放。"
"AI 产品助手" : "已补充异常场景和验收标准。你可以在右侧确认内容，再选择所属版本。"
Keep line length comfortable, around 20 Chinese characters per line, legible 16px. Under final AI response, quiet text link "查看本次修改". Fixed input composer near bottom of chat, unobtrusive subtle border, placeholder "继续补充目标、场景或约束…", attach icon and teal send button; small context tag above composer "上下文：需求草稿".
- Right live structured requirement document panel x=858 to 1440, separated by fine vertical rule, generously padded 32px.
Header small "需求草稿" with tiny "自动保存草稿" muted label, then title "播放失败后一键重试", small neutral "草稿 · 第 3 次修订".
Document text in sparse sections:
"用户目标"
"播放失败后快速恢复观看，减少重新查找进度的操作。"
"功能范围"
"显示重试入口；保留失败时的进度；成功后续播。"
"验收标准"
Three teal outlined checkbox rows:
"播放失败时，展示重试按钮"
"恢复网络后，用户可手动重试"
"重试成功后，从原播放进度继续"
"异常情况"
"再次失败时保留进度，并允许继续重试。"
A fine divider. Version selector block with label "所属版本" and selected dropdown "v1.8.0 · 播放体验优化". Small role row "负责人  王洋".
Bottom sticky clean footer in document panel, large teal primary button "保存并加入版本", small adjacent neutral "仅保存草稿". Below footer "加入版本后，进入版本需求评审" in small muted text.
- Very subtle bottom footer "设计示例 · 2026-10-03".
Emphasize the natural transition from human dialogue to durable requirement document and version assignment. The two panels should feel like one collaborative workspace, not disconnected forms. Keep text complete and readable. No fake analytics, no overpacked cards, no extra panels, no instructions overlaid outside the UI.
```

## 3. workspace

```text
Create an exceptional realistic desktop web application UI design, one focused screen only. Target 1440 x 1024. Full viewport app, no browser chrome or device bezel, no collage, no presentation captions. Use perfectly legible Simplified Chinese UI copy, with English only in real paths, file names, commit IDs and branch names. Current date anchor 2026-10-03, Asia/Shanghai. Tiny footer "设计示例". This is a proposed AI-native R&D application called "Harness 研发" built on DeepSeek Harness, not a screenshot of an existing shipped product.
Concept name: "研发任务舱". Workspace-first task delivery view. Hard workflow: product chats to create a requirement -> add to a version -> product/development/testers review the version -> development chooses a connected local workspace and modifies code with AI -> submit for testing with code/build/self-test evidence -> tester runs tests and routes defects back to developer. This frame focuses on developer reviewing a completed implementation and preparing a test handoff. Keep the link to approved requirement and selected workspace clearly visible. User must explicitly choose the workspace. AI completion and developer self-test are distinct from tester acceptance.

Art direction: polished professional developer tool, restrained light central surface with a graphite sidebar, cobalt blue accent #406AFF and mint green success. Palette sidebar #18212D, main #F8FAFC, white content, dark ink #182230, muted grey #66758C. Comfortable product typography, clear 14-16px Chinese body, 26px heading, monospace only for code identifiers. Tidy flat surfaces, generous padding, fine dividers, no nested card clutter. Not a neon sci-fi dashboard. Mostly light screen; dark color confined to left sidebar and one concise code-diff excerpt.

Layout:
1. Left graphite sidebar 208px with white "Harness 研发". Project name "视频客户端". White and grey icon nav "我的工作" (selected pale blue translucent), "需求池", "版本", "工作区", "测试". Below a modest subsection "当前任务" with "REQ-024" and two lines "播放失败后一键重试". Bottom avatar "王洋 · 开发".
2. Main header across remaining area. Breadcrumb "v1.8.0 / REQ-024". Bold title "播放失败后一键重试". Small neutral status "开发中". Under title compact green check label "需求评审已通过 · 修订 r3". Right a prominent cobalt primary action "提交测试".
3. Under header, slim clean scope bar: outline monitor icon, "工作区" followed by selector "MacBook / video-client" and small green "已连接". Next line or aligned small metadata "分支 feature/retry-playback" and quiet action "切换工作区". Selected workspace shown as explicitly chosen. A small full path can read "/workspace/video-client". Do not use any private real path. No modal obscures the workspace.
4. Content area left approx 700px wide and right 340px wide, separated by line. Left tab strip "实现与验证" active, "代码变更", "执行记录". Below heading "AI 已完成修改，等待你的检查". Short summary sentence "新增失败重试入口，保留播放进度，并补充恢复网络后的测试。".
5. Left section "代码变更" with compact single grouped file list:
"PlayerViewModel.kt" "＋38 −7"
"PlaybackErrorView.kt" "＋24 −3"
"RetryPlaybackTest.kt" "＋56".
Below list, one small dark code diff preview as a visual accent, around 160px high, clean readable monospace; show 5 lines only, file heading "PlayerViewModel.kt", green added lines demonstrating "fun retryPlayback()" and "player.seekTo(lastPosition)" and "player.play()". Tiny neutral "仅展示局部差异" caption. No extra file tree or full IDE.
6. Below diff, light section "开发自测". Three check rows "重试入口显示正常", "网络恢复后可手动重试", "恢复原进度后继续播放". Green small labels. A final muted statement "自测完成，测试验收尚未开始". This distinction must be very legible.
7. Right side is the supporting test handoff pane, heading "提测清单", small "本次提测 · 第 1 轮".
A simple vertical form/list with fine separators, showing evidence metadata:
"需求基线" / "REQ-024 · r3"
"代码提交" / monospace "a18c2f7"
"构建包" / "video-client-1.8.0-rc1.apk" and small attached-file icon
"测试环境" / "Android 测试环境"
"自测报告" / "已附加 · 3 项通过"
"测试负责人" / "陈晨".
A subtle light blue note underneath: "提交后进入待测试，由测试负责人确认结论。"
8. Lower right a discreet AI contextual section only two sentences, title "AI 交接摘要". Text "已整理改动范围、验证结果和回归建议。" A simple outlined text action "查看完整提测说明". At bottom a quiet input composer "让 AI 补充回归建议…" with send icon, not a huge chat feed.
9. Small task stage strip near footer or header: "评审通过 → 开发 → 待测试 → 测试验收" with 开发 active, later stages muted. Only one step strip, no redundant progress metrics.

Must feel like a useful actual software screenshot, not a conceptual infographic. Strong natural information hierarchy; the single clear primary action is 提交测试 and its prerequisites are visible. No metric cards, no fake charts, no success claim for testing not yet done, no floating windows. Keep all content within the frame and all Chinese text sharp.
```
