# 前端改动台账 · M1 止血

> 用途：前端机（本机）改动的唯一权威记录。若本地改动再次丢失，可按本台账逐项重做，不必依赖记忆。
> 状态：**步骤 1 已开工并提交**（分支 `feature/m1-stabilize`）；步骤 2~6 待做。
> 基线更正：HEAD `1732656` = 130 pass；步骤 1 完成后 = **131 pass**（新增 R-1 回归）。
> 注：本文件曾写「尚未开工」而工作树已改，属文档漂移（安全侧 S-14），已修正。

## 0. 工作约定（已拍板）

| 项 | 约定 |
|---|---|
| 推送策略 | **每步 commit 后立即 push**（最多丢一步，不攒批） |
| 执行顺序 | 计划定稿认可后再动手 |
| 台账 | 本文件，随每步更新「状态 / 提交号 / 已推送」 |
| 只读边界 | 前端机**不碰** `data.json` / `video.json`（归采集端整文件重写） |
| 测试基线 | `node --test tests/logic.test.js tests/render.test.js tests/data-contract.test.js`（必须显式列文件） |
| 基线 | **132 pass / 0 fail**（HEAD `1732656` = 130；步骤 1 后 = 131） |

## 1. 背景：一次真实丢失（必须先记住）

此前已完成的 4 步前端改动（3 个 commit）**整批丢失**：不在当前历史、不在 reflog、不在 stash、工作树干净。
丢失原因未查明（未执行过 reset / delete-branch / force-push）。教训：**攒批 = 丢整批**，故改为每步即推。

## 2. M1 六步（含验收）

### 步骤 1 · R-1 止血：不再按 risk 文案删场
- **改**：`app.js` `isTVMatch`（L682-684）、`isTVSchedule`（L687-688）——去掉 `&& !riskSaysNoTV(...)`，只保留 `isCCTVChannel(...)` 判定
- **留**：`riskSaysNoTV` 函数保留不删（将来只做告警，不参与判定）
- **对应**：病灶 R-1 / 指标 M-4（采集端文案不得改变场次集合）
- **验收**：`isTVMatch({channel:'CCTV-5', risk:'建议用央视频全程观看'})` → **true**（修复前 false）
- **测试**：新增 1 条回归（130 → 131）；同时修正 2 条断言旧行为（risk 可删场）的用例
- **状态**：✅ 已完成并推送（分支 `feature/m1-stabilize`）；实测 131 pass / 0 fail

### 步骤 2 · 停用筛选隐藏（修 R-6 纯日韩日空白）
- **改**：`app.js` `applyFilter`（L1618 起）函数体改为 no-op（只保留 `FILTER = scope` 兼容旧调用，**不再隐藏任何 day**）
- **不动**：`FILTER` 变量、5 处调用点、`data-scope` 属性 → 留待 M3 前端重写彻底清除
- **对应**：决策 Q1（删掉筛选、只做国乒）；病灶 R-6
- **验收**：含日韩场次的 day 不再整段空白（Node 层无 DOM，依赖测试不回退 + 代码审查）
- 状态：✅ 已完成并推送

### 步骤 3 · 世界排名中文化（Q12）
- **改**：`app.js` `ordinalizeInfo`（L284）——不再把「世界第N」转成 `1st`，直接返回中文原文
- **留**：`ordinal` / `fmtRank` 函数体不动（`fmtRank` 经查为死代码，0 调用点，M3 清理）
- **对应**：决策 Q12
- **验收**：`ordinalizeInfo('世界第1')` 输出含「世界第1」，不含 `1st`
- 状态：✅ 已完成并推送

### 步骤 4 · 存活面板移出首屏（Q4 / B-05）
- **改**：`index.html` 调换 `#survival`（L23）与 `#days`（L26）顺序 → `#days` 在前
- **不动**：`app.js`（已确认 `getElementById('survival')` / `getElementById('days')` 各仅 1 处，按 id 各自填充，不依赖顺序）
- **对应**：决策 Q4 / B-05
- **验收**：`grep -nE 'id="(days|survival)"' index.html` → days 行号 < survival 行号；测试 131 全绿
- 状态：✅ 已完成并推送

### 步骤 5 · 字号分层（Q11）
依据：`style.css` 共 **65 条 <18px**（关键 28 / 次要 37），已按 N7/N8/N9 校正：

| 处理 | 范围 |
|---|---|
| **提到 ≥18px**（关键） | 时间、频道台号（`.match__chan` `.pending__chan` `.sched__chan` `.vmatch__chan`）、对阵双方、比分表、日期头、徽章（`.tag` `.risk__badge` `.pending__badge` `.live-badge`）、`.match__stage-detail`、`.vmatch__event`、`.prog__result`、`.emeta__rank-item`、`.surv-squad__label`（改判为关键） |
| **保留 14~16px**（次要） | 页脚、来源说明、角标、附注；含改判为次要的 `.squad-rank` / `.roster-rank` / `.roster-reason`；视频块文案（`.vmatch__note` `.vmatch__lead` `.vmatch__hint` `.vmatch__follow` `.vchip`） |
| **平台胶囊** | 仅 `.vmatch__chan` 一类平台名提到 ≥18px（N9） |
| **直接删除** | 重播相关 7 条（L744-L785：`.match__replay` `.replays__head` `.replay__item` `.replay__line2`）连同 `app.js` 的 `renderReplayZone`（L312）/ `replayTargetDate`（L296）等重播渲染逻辑（N8，重播功能已砍） |
| **不改** | `.surv-chip__x`（12.6px，仅为淘汰标记）、`.risk__stat-card__label`（13px，纯标签） |

- **验收**：关键类选择器字号 ≥18px；次要类不变；测试全绿；重播样式与渲染代码无残留
- 状态：✅ 已完成并推送（清单需先过目）

### 步骤 6 · R-3 已知限制测试（N6）
- **加**：`tests/logic.test.js` 追加「已知限制」用例——记录 `parseNextRoster(data.nextEvent.note)` 当前会从散文名册解析出垃圾条目（如「咪咕视频同步直播」被当选手）
- **不修**：真正修复在 M2（结构化 `nextEvent.roster` 取代 `parseNextRoster`），届时该用例改写
- **验收**：测试通过（作为提醒存在），未来 M2 修复时该用例会红
- 状态：✅ 已完成并推送

## 2.5 技术方案评审团补录决策（2026-09-27）

由「技术方案评审团」（架构/安全/质量）评审后新增，均已拍板：

| 编号 | 决策 | 依据 |
|---|---|---|
| **ESM** | **本轮不做 ES module 拆分**，M3 后再评估 | 拆分不解决 R-1/R-2/R-3（根治靠结构化契约），却新增两个部署失败模式：lib 漏拷=真白屏、10 分钟缓存错配窗口 |
| **H-01** | Pages 白名单改用 **staging 目录**（`_site/`），非「path 改文件列表」 | `upload-pages-artifact@v3` 的 `path` 只接受单目录，文件白名单不可实现 |
| **H-01b** | 锁死 `upload-pages-artifact@v3`，禁止升 v4/v5/main | 新版本 `include-hidden-files` 默认 false → 静默排除 `.nojekyll` → Jekyll 接管 → 站点故障 |
| **CI 门禁** | 部署流水线插入 `node --test` 门禁 | 采集端每 8h 自动推 → 零校验直达外婆手机，最现实的投毒路径 |
| **B 面** | **接受公开仓库暴露风险，只修 A 面（Pages）** | 泄露内容为运维日志+内网代理地址，全仓无凭据；白名单治不了 raw 访问与 git 历史 |
| **回归判据** | 废掉「diff 为空」，改契约喂数三条断言 | 实测 diff 为空属数据偶然（19 场仅 2 场带 risk 且无否定词） |

## 2.6 架构师补派评审的核心发现（2026-09-27）

### ⚠️ 纠正此前记载的一处错误
**`tvAvailable` 缺省的 fail-safe 不是「缺失=true」**。若实现成 `tvAvailable !== false`，会让
`isTVMatch({channel:'咪咕视频'})` 由 **false 变 true** → 咪咕场次进外婆电视表，**违反「只看央视」铁律**。
正确为**两级回落**：`tvAvailable ?? isCCTVChannel(channel)`——缺失时沿用现有频道判定、结果不变。
（计划书 H-05b 第③条断言已据此改为 `isTVMatchV2({channel:'咪咕视频'}) === false`）

### 实测复现的 3 条「内容静默消失」路径（架构师构造样本验证）
| # | 路径 | 位置 | 后果 |
|---|---|---|---|
| 1 | 昨日 schedule-only / dayNote-only → `pastContent` 只认 `isTVMatch(matches)` | `app.js:1868` | **昨日战报整块消失** |
| 2 | 同一天既有 schedule 又有 dayNote → else-if 互斥链 | `app.js:2238` | **dayNote 被静默丢弃** |
| 3 | `applyFilter` 硬编码 `FILTER='cn'` | `app.js:1621` | 纯日韩日整段空白（R-6，即步骤 2） |

### `isPPTVWindow` 判据不成立（实测 8 样本 5 误判）
足球世界杯预选赛、羽毛球公开赛、中网男单、排球世锦赛、全国田径锦标赛**全部误判为乒乓**。
根因：16 个关键词里「决赛/单打/团体/世界杯/锦标」是**跨项目通用词**——这不是宽口径，是「用子串猜语义」。
过渡期建议：只留乒乓专属词（乒乓/WTT/世乒/国乒/桌球）+ tournament 优先。

### 规模口径修正
解析器实际为 **16 块 / 807 行**（非 682 行 / 8 个），其中 `renderNextCard`(L1382-1551) 170 行是解析+渲染混合体，需先拆成两半才能删。

### 架构师对 M3 拆分的反直觉结论
单文件 `app.js` 是**唯一不可能版本错配的部署单元**（index.html 与 app.js 要么都新、要么都旧）。
若 immutable 资源路径（hash 文件名）无干净解法——零构建下需人工改 index.html 的 src，在双机节奏下必错——
**则 M3 也不应拆**。此结论与已拍板的「先不拆」一致，但给出了更强的理由。

### 建议：M1 剩余可做的零架构风险小改
A. staging 目录（部署侧）　B. `pastContent` 复用 `dayHasContent`（1 行，修路径 1）
C. dayNote 移出 else-if 互斥链（修路径 2）　D. 导出清单元测试（防漏导出=逻辑裸奔）

## 3. 相关决策索引（完整 23 项见计划书 §5.4）

Q1 删筛选只做国乒 · Q4 存活面板移出首屏 · Q11 字号分层 · Q12 中文「世界第N」 · Q13 直播中时长 2h · N6 R-3 已知限制测试

## 4. 未决 / 待观察

- 本地改动丢失根因未查明 → 以「每步即推 + 本台账」对冲
- 步骤 2 停用筛选后，过渡期日韩场次会显示（真正的「只做国乒」依赖采集端 Q2 不采日韩）

## 2.7 M1 全部完成（2026-09-28）

| # | 步骤 | commit | 验证 |
|---|---|---|---|
| 1 | R-1 不按 risk 删场 | ce7a3a7 | CCTV-5+央视频 risk → true |
| 2 | 停用筛选隐藏（R-6） | b3b25b8 | applyFilter no-op |
| 3 | 世界排名中文化（Q12） | c678085 | 保留「世界第1」 |
| 4 | 存活面板移出首屏（Q4） | c6e8efb | days(25) < survival(62) |
| 5 | staging 白名单 + CI 门禁 | 6ff462c | 本地预演 6 文件齐全、无内部文档 |
| 6 | isPPTVWindow 删通用词 | 9380b41 | 11 样本 0 误判 |
| 7 | 昨日战报不再消失 | 4036ca4 | 0 → 1 |
| 8 | dayNote 不再被丢弃 | a436532 | HTML 含 dayNote 内容 |
| 9 | 字号分层 + 删重播样式 | b144728 | 关键类 <18px 剩 0 |
| 10 | R-3 已知限制测试 | 2d1ddba | 132 pass |
| 11 | 重播逻辑下线（N8） | 824cecc | 页面无 replay__item |

**过程中发现并修正的一处自身回归**：步骤 8 拆开 `else-if` 链后，2290 行 `else if(nextEvent)`
挂靠对象变化，导致「有 schedule 但无 dayNote」的日子错误渲染「📋 待公布」（真实数据 9/28 复现）。
已改为独立 `if` + 完整前置条件。教训：改条件链末级时必须检查挂靠对象。

**基线演进**：130（HEAD 1732656）→ 131（R-1 回归）→ **132**（R-3 已知限制）
