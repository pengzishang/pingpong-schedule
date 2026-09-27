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
| 基线 | 130 pass / 0 fail（HEAD `1732656`） |

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
- 状态：待做

### 步骤 3 · 世界排名中文化（Q12）
- **改**：`app.js` `ordinalizeInfo`（L284）——不再把「世界第N」转成 `1st`，直接返回中文原文
- **留**：`ordinal` / `fmtRank` 函数体不动（`fmtRank` 经查为死代码，0 调用点，M3 清理）
- **对应**：决策 Q12
- **验收**：`ordinalizeInfo('世界第1')` 输出含「世界第1」，不含 `1st`
- 状态：待做

### 步骤 4 · 存活面板移出首屏（Q4 / B-05）
- **改**：`index.html` 调换 `#survival`（L23）与 `#days`（L26）顺序 → `#days` 在前
- **不动**：`app.js`（已确认 `getElementById('survival')` / `getElementById('days')` 各仅 1 处，按 id 各自填充，不依赖顺序）
- **对应**：决策 Q4 / B-05
- **验收**：`grep -nE 'id="(days|survival)"' index.html` → days 行号 < survival 行号；测试 131 全绿
- 状态：待做

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
- 状态：待做（清单需先过目）

### 步骤 6 · R-3 已知限制测试（N6）
- **加**：`tests/logic.test.js` 追加「已知限制」用例——记录 `parseNextRoster(data.nextEvent.note)` 当前会从散文名册解析出垃圾条目（如「咪咕视频同步直播」被当选手）
- **不修**：真正修复在 M2（结构化 `nextEvent.roster` 取代 `parseNextRoster`），届时该用例改写
- **验收**：测试通过（作为提醒存在），未来 M2 修复时该用例会红
- 状态：待做

## 3. 相关决策索引（完整 23 项见计划书 §5.4）

Q1 删筛选只做国乒 · Q4 存活面板移出首屏 · Q11 字号分层 · Q12 中文「世界第N」 · Q13 直播中时长 2h · N6 R-3 已知限制测试

## 4. 未决 / 待观察

- 本地改动丢失根因未查明 → 以「每步即推 + 本台账」对冲
- 步骤 2 停用筛选后，过渡期日韩场次会显示（真正的「只做国乒」依赖采集端 Q2 不采日韩）
