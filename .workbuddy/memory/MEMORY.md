# 项目记忆: pingpong-schedule 央视乒乓赛程

> 完整指令在项目根 `采集说明.md`（唯一指令源）。本文件只记**踩坑与判据**，不重复指令书。
> 赛事细节逐轮留档在 `data.json` 的 `note`/`nextEvent.note` 与 `每日乒乓球赛事早报/`。
> （2026-09-07 15:36 重写：合并重复的推送踩坑、删去已完赛细节、压到可注入体积。）

## 铁律速查
1. **updatedAt 必刷 + 写完即推送**：bump 时间戳 → `json.load` 通过 → **立即** commit/push，早于早报/记忆/单链对齐。诚实性靠 note 如实写复核结论，**绝不伪造赛果**。
2. **JSON 硬校验**：只依赖 `json.load` 是否抛错。复杂转义别塞 `python -c`+单引号 → 写临时 .py 再删（收尾 `rm`）。
3. **先拉后采/先拉后推**：读或 push 前 `git fetch origin && git rebase origin/main`。禁止强推。**每轮开头先 `git status --short` 查残留**（9/6 轮曾脏工作区导致 rebase 失败 → 先 commit 固化再 fetch）。
4. **前端测试 `node --test tests/*.test.js`**（不能 `node --test tests/`），**0 fail 才推**。
5. **生成脚本幂等**：会 prepend note 的临时 .py 开头加 MARK 检查（`if MARK in note: sys.exit(1)`）。
6. **curl 校验**：Git Bash 的 `/tmp` Windows 版 Python 看不到 → 下载到**仓库内**再删。

## 推送环境踩坑（2026-09）
- **GitHub 直连 `Recv failure: Connection was reset`** → 走本机代理 `http://127.0.0.1:7897`（env `TELEGRAM_PROXY`）。PowerShell 里先设 `$env:http_proxy`/`$env:https_proxy` 再 fetch/rebase/push。curl 拉 raw.githubusercontent.com 同样要带 `-x`。
- **Git Bash 里 `git push` 挂死**是 GCM 卡 GUI 登录（`GIT_TERMINAL_PROMPT=0 git -c credential.helper= push` 可秒验）→ 直接用 **PowerShell 工具**跑 push。
- 判定顺序：push 失败 → curl 测直连 → 不通就上代理，别干等重试。`pkill -f "git push"` 会瞬时弄坏 `origin/main` 引用，过几秒自愈。

## 单链滚动刷新（once 链）
- 全局同时仅 1 个 name 含「刷新」的 **once**（recurring 主任务名也含「刷新」，不算）。命名 `刷新链-[YYYYMMDD]-[HHMM]`，`cwds` = `C:/Users/pengz/Documents/GitHub/pingpong-schedule`。
- **创建 once 不要传 `rrule`**（once 只需 `scheduledAt`），误传会原样存下、有重复触发风险。
- 刷新时刻：赛前 T=K-1h（仅 T∈(now,now+30h]）；赛中整链只加 1 个 now+30min 点；升序后 30 分钟聚类（≤30min 并入取最晚）；取 ≥now+30min 最早簇为 T_next；无候选则链暂歇。**凌晨场（00:00-07:59）真实开赛是次日，K 须修正**。
- 对齐时**先 list 再删旧建新**；防链路断裂可「先建新、确认后删旧」。

## 数据约定
- days 四日期：昨日（带 result，**原样保留**）+ 今日 + 明日 + 后日。risk 仅未结束场填（🔴/⚠️/✅ + 括号大白话标签 + 口语原因，台号写 `央视5`/`央视5+`，整段 2~3 句）。
- **空窗天整段说明写入 day 顶层 `dayNote` 纯字符串，`schedule` 置空 `[]`**。有真实直播的日子**不要写 dayNote**（`renderDaySection` 是 else-if，写了＝死内容）。
- **`dayNote` 首句铁律**：只有 `first.search(/[（(：:]/) > 3` 才取前缀作 lead。要点每条 ≤100 字、**每天 ≥8 条**、`。` 分隔、括号成对；末尾保留「下一站…」句（句内**禁句号**）。
- **【9/8 定型·每日收录口径】** 有真实直播的日子**每天固定收录 4 场 = 国乒场次 + 日本焦点**（如 9/8：陈熠、陈垣宇、张本智和、张本美和）。窗口内其余场次不写进 matches，改在**当日早报正文**列全 13 场 —— 既守住卡片不撑爆，又不留信息盲区。别再为「要不要加第 5 场」反复摇摆。
- 名单句 `出战:男单…/…,女单…/…,缺席:…。`；**口诀「名单句在前、`背景:` 断后」**（`缺席:` 的 lookahead 会吞掉后续全部文本，必须用 `背景:` 截断）。
- **`nextEvent.note` 追加文本禁用 `→`**（触发时间线分支），脚本里加 `assert`。
- video.json 顶层仅 `days[]`，用 `platform`（非 channel）；`renderVideoBlock` **不渲染 result** → 赛果写进 `note` 首句。团体赛按 5.3.1。
- **【倒数日铁律 2026-09-08 子上定】** 赛事已开打（`ne.date ≤ today`）→「距今天 X 天」徽章/字段**一律不显示**。日期本身已是「今天/已开始」的清晰信号，「距今天 0 天」是无信息量的冗余。
  - **三处同步守卫**：`buildBelow` 的 `tag--soon` 徽章 + `nextEventCompact`（「今日无直播」卡简版）+ `nextEventCompactNoDate`（顶部 pending__next 简版）。
  - **判定用真实日期** `isNextEventStarted(ne, today)`（`ne.date ≤ today`）；**不依赖采集端 daysAway 字段**（2026-09-08 实测：date=9/8 但采集端错填 daysAway=7 → 即便如此徽章也隐藏）。
  - 三个函数都得加 `now` 形参（compact/NoDate），调用点在 `renderDaySection`（`ctx.now` 可用）。
  - 末尾 `module.exports` 同步补 `isNextEventStarted / nextEventCompact / nextEventCompactNoDate`；`tests/logic.test.js` 加 9 条真值表 + 渲染断言。
- **【下一站模块窗口铁律 2026-09-08 子上定】** 整个「下一站国乒赛事」模块**仅在「今天/明天/后天都没有当前赛事安排」时出现**；只要 `nextEvent` 指向的赛事开始日落在 `[今天, 今天+2]` 窗口内（含今天），模块整体不显示。子上原话：`那个模块出现的条件是"今天明天后天已经没有当前赛事的安排了"`。
  - 新增 `isNextEventWithinWindow(ne, today, horizonDays=2)`（`ne.date <= addDays(todayKey, 2)`）。
  - `buildBelow` 模块渲染条件：`data.nextEvent && data.nextEvent.date && !isNextEventWithinWindow(data.nextEvent, ctx.now)`。
  - 判据用**真实日期**（不依赖采集端 daysAway）；上一轮「倒数日徽章」铁律已覆盖 `isNextEventStarted`，本铁律范围更宽（±2 天），模块消失即徽章随之消失。
  - 末尾 `module.exports` 补 `isNextEventWithinWindow`；`tests/logic.test.js` 加 9 条（107/107 全绿）。

## 自检两层必做
① **解析层** `api.parseDayNote`：points≥8、最长≤100、括号配对、next 抽到、squad/absent 与 dayNote 一致。
② **渲染层** `buildAbove(api.prepareCtx(d), d)` + `buildBelow(ctx, d)`：`<section>` 正常值 **4**（今/明/后 + 下一站卡；昨日空窗天不渲染）。
- `pending__points` **不是固定值**：只统计 dayNote 要点块，有真实直播的日子不产出要点 → 数值变小属正常，别误判。
- `mergeVideo` 可能返回 undefined → 必须 `(r&&r.days)?r:data` 兜底。
- `parseNextEventNote` 必须传 `.note` **字符串**（传对象会变 `"[object Object]"`）；名单挂 `roster`。
- **排行榜只在 meta 块渲染**：`maybeRankList` 要求「`标签:项1 / 项2 / …`」且每项含数字、≥4 项；分块顺序 isTV>isSeeds>isSched>isSquad，**子句含「种子/排名/参赛/国乒/出战」会落进 seeds/squad** → 位次表措辞须避开这些词（测试要求 `emeta__rank-item` ≥10）。
- **`next__lines` 需要 schedule 或 tv 段含 ≥2 个分句**（多句被 `；` 拼起来）；只有 1 句会退化成 `next__body`，`render.test.js` 第 20 例会挂 → 采集端保证写 ≥2 个含「转播/直播/CCTV」的子句。
- 修前端解析问题优先**在采集端改写法**，不动 app.js。
- **【9/8 新坑·空窗期结束后的守卫用例】** 空窗期一结束，四日窗口内再无「无央视直播 + 带 dayNote」的可见天 → `pending__points` 不产出，`render.test.js` 末例会挂。已在该例加「窗口内存在可见空窗天才断言」的守卫（自动休眠、下个空窗期自动恢复）。⚠️ 判「今天」必须用**本地日期**拼接（`getFullYear/getMonth/getDate`），**禁用 `toISOString().slice(0,10)`**——UTC 差 8 小时，凌晨场会误判成昨天。
- **`nextEvent.note` 追加句必须命中分类关键词**（`CCTV/直播/转播/频道`→tv；`赛程/开打/1/8/决赛/对阵/签表`→sched；`国乒/出战/参赛`→squad），否则落进 `meta` 把首段撑成大坨。

## 前端已知行为（不是 bug）
- 昨日若 `matches` 为空 → 该日整段（含 dayNote 与 video 块）都不可见，video.json 给"昨日"写内容属死内容（保留无害）。
- 视频块只在「当日无央视电视直播」分支渲染 → 有央视的日子不必写 video.json。
- **【铁律】重要战报必须落在"今日" dayNote**：跨日界后上一日结论要在今日 dayNote 复述（带比分）。

## 采集环境
- **epg**（直播时间一手权威）：`sports.cctv.com/epg/index.shtml?channel=cctv5|cctv5plus|cctv16&date=YYYY-MM-DD`，须核对日期导航栏是否滚到目标日。重大赛事前 3 天即可锁定。
- `WebFetch tv.cctv.com/live/cctv5plus/` 自 9/1 失效。咪咕三入口排期会变，每轮必重抓。
- 失效源黑名单：sports.sina.com.cn/pingpang、sports.163.com/pingpang、s.weibo.com、so.toutiao.com、sports.sina.cn 首页聚合稿、k.sina.cn 聚合稿、cnyouth.com、搜狐 1071907758、网易号「乒乓乐园」L61A6BPG0556J6QW。
- **AI 体例聚合稿识别**：「结论:」式结构、无一手信源、标题带问号/已过时、基础事实陈旧 → 不采其独有细节。
- **场馆口径唯一权威**：澳门 = 澳门东亚运动会体育馆；亚运乒乓 = 丰田天空大厅。
- 单回合无法回收后台 subagent → 采集走「编排器自采」更可靠。

## 真伪判定（核心）
- **【铁律】结论与依据分开判定**：依据错只否定依据，结论另行求证，不得连坐否定。（教训：9/3 判「王楚钦退赛」不实，9/4 WTT 官方证实属实。）
- 「矛盾」先查是不是「描述不完整」；**比分顺序**先镜像校验（统一取胜者视角）；**赛程时刻取多数**，少数派留痕。
- 量化数字打架就别写 → 只写定性。条件场作废：上轮「若 A 胜则…」本轮必复查。
- 权威源优先级：@WTT世界乒联微博(uid 7556183438) + WTT 官网球员更新 = 官方口径，单源可写名单/退赛；网易/搜狐/腾讯正文次之。终局后 5~15 分钟发稿 → 开赛超 1 小时仍未发 = 仍在进行。
- **识别标记（命中即判错）**：把本届亚运写成「杭州亚运会」（实为日本爱知·名古屋）；澳门站名单出现温瑞博/向鹏（8/28 前旧稿）或林诗栋（9/5 22:16 前旧稿）；「537 万/2000 积分」= 大满贯口径；冠军赛「需从资格赛打起」（实为各 32 人正赛）；同稿内时差 ≠ 6 小时。
- 改了 nextEvent.note 的定案后，**回头检查四天 dayNote 名单句是否同步**。
- 单源新事实：不写进 matches，改在 dayNote + note 以「仅 N 源、待复核」披露，列入下轮待办。

## 直播渠道判定
- 主办方乒协稿只提当地台 ≠ 国内无版权；低级别站次必查咪咕专区一手排期。
- 有直播但对阵未公布 → 不要硬凑 playerHome/Away。
- 国乒零报名的全外协低级别站即使有咪咕直播也不写 video.json，但必须在 note 留痕理由（收官日四冠等高信息量场次可保留）。
- 国乒选手海外联赛（樊振东德甲）有国内平台转播 → 必须写 video.json。

## 赛事背景（仅留判据指针，细节见早报/data.json）
- **WTT 澳门冠军赛 9/8-13（澳门东亚运动会体育馆）**：冠军 1000 分；1/16 与 1/8 五局三胜、1/4 起七局四胜。央视 epg 已锁定 9/8-9/13 每日 CCTV-5+ 11:00 + CCTV-5 18:30（9/13 为 11:00 半决赛 + 18:30 决赛）。
  - **国乒 7 人**：男单 周启豪/陈垣宇/黄友政（全非种子，全在下半区）；女单 蒯曼(2)/陈幸同/王艺迪/陈熠。缺席 孙颖莎、王曼昱（轮休备战亚运）、王楚钦(9/4 伤退)、林诗栋(9/5 病退)、梁靖崑、温瑞博、向鹏。
  - **种子**（9/7 重排定案）：男单前四 松岛辉空1/张本智和2/莫雷加德3/林昀儒4；女单前四 张本美和1/蒯曼2/王艺迪3/早田希娜4。
  - **国乒首轮逐日（9/7 15:36 全面定案）**：9/8 11:00 陈熠、12:45 陈垣宇；9/9 11:00 王艺迪、11:35 黄友政、19:40 蒯曼；9/10 11:35 陈幸同、12:10 周启豪（9/10 待窗口滚动后写入）。
  - ⚠️ **已结案勿再纠结**：张本美和首轮＝**9/8 19:05**（7 源）；黄友政 **11:35**（5 源对 2）；蒯曼 **19:40**（4 源对 1）；9/13 半决赛 **11:00**。
  - **央视5+ 上午窗口只到 14:37/14:36** → 15:05 那两场（9/8 卡尔伯格、9/9 塔卡）电视看不到，不写 matches。**同判据推广**：离切播只剩几十分钟的也不写（9/8 14:30 大藤沙月只剩 7 分钟）。
- **阿拉木图常规挑战赛 9/1-6 已收官**（国乒零报名）：日本 3 冠 2 亚、俄罗斯 2 冠。男单 户上隼辅 4-0 西蒙·高茨(12-10、11-8、11-3、11-7)；女单 平野美宇 4-1 早田希娜(11-9、9-11、11-7、11-1、11-8)；女双 平野/木原 3-0(11-2、11-5、20-18)；男双 卡斯特曼/格列布涅夫(俄) 3-2 卡尔森兄弟(11-9、8-11、7-11、11-7、11-9)；混双 季霍诺夫/潘菲洛娃 3-0(11-9、11-4、11-5)。
- 译名归一：西多伦科=希德仁科；林钟勋=林仲勋；A·勒布伦=艾利克斯·勒布伦；季霍诺夫=蒂霍诺夫；孟凡博=孟繁博；马蒂亚斯·卡尔森=法尔克；阿布拉米安=阿布拉术安；梅谢芙=梅瑟夫。完整表见 `name_alias.md`。
- **紧邻赛历**：阿斯塔纳球星赛 9/15-20 → 亚运 9/20-28（丰田天空大厅，乒乓 21 人，领队王励勤）→ 中国大满贯 10/1-11 北京首钢园 → 亚锦赛 10/19-25 塔什干 → 总决赛 12/9-13 香港启德体育园。
