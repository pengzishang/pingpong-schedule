# 项目记忆: pingpong-schedule 央视乒乓赛程

> 唯一指令源＝项目根 `采集说明.md`。本文件只记**踩坑与判据**；赛事细节留档 `data.json` note 与 `每日乒乓球赛事早报/`。前端自检细节见 `.workbuddy/memory/前端自检细则.md`。（2026-09-16 重写压缩）

## 铁律速查
1. **updatedAt 必刷 + 写完即推送**：bump → `json.load` 通过 → **立即** commit/push，早于早报/记忆/单链。**绝不伪造赛果**，未结束 `result` 留空。
2. **JSON 硬校验**只靠 `json.load` 是否抛错；复杂转义别塞 `python -c`+单引号 → 写临时 .py 再 `rm`。
3. **先拉后采 / 先拉后推**：`git fetch origin && git rebase origin/main`；禁强推；**每轮开头先 `git status --short`**。
4. **前端测试 `node --test tests/*.test.js`**（不是 `tests/`），**0 fail 才推**。
5. **生成脚本幂等**：prepend note 的临时 .py 加 MARK 检查（`if MARK in note: sys.exit(1)`）。
6. **远端校验优先用 PowerShell**：`Invoke-RestMethod` + 代理 127.0.0.1:7897 直接读 raw.githubusercontent.com（Git Bash 里 curl 直连会挂死 3 分钟）；要下载到**仓库内**再删（`/tmp` Windows 版 Python 看不到）。临时文件被占用删不掉时先 TaskStop 再用 Python `os.remove`。

## 推送环境
- 代理 `http://127.0.0.1:7897` 配在 Git 全局 `http(s).proxy`；`curl`/`git` 走它可通 **大部分站点（如 baidu 返回 200）**，但 **GitHub 经该代理与直连均持续 TLS EOF(error:0A000126) 失败**（`git push origin main` 一律 `ec=128`）；SSH:22 端口虽通但本机无 `~/.ssh` 密钥故无法改走 SSH。属本机↔GitHub 链路性中断，**每轮开头验证连通性**，连通才推、不通则启动后台重试循环（见下）而非卡死。
- **【2026-11-10 实测】本会话仅 `powershell.exe`(5.1) 在 PATH、`pwsh`(PS7) 不存在** → 后台启动重试循环必须用 `C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe` 全路径 `-File _push_retry.ps1`，裸 `pwsh` 会「系统找不到指定的文件」失败。
- **【外网受限·赛果不编造铁律·2026-11-09~11-10 三连轮实证】**：当 WTT.com/ITTF.cn/results.ittf.link 全部 TLS 阻断、且 Web 多引擎/维基仅返百科泛页时，**绝不臆造决赛比分**——已结束场次维持 `risk-only`、不填 `result`，在 data.json `note` 与早报显式标注「网络受限·赛果待核实回填」。同时**先 `git commit` 固化本轮工作、再靠 `_push_retry.ps1` 后台重试**（proxy↔direct 轮换、60s/轮）把累积提交（曾堆积 9~10 个）在 GitHub 恢复后自动推送并校验 `HEAD==origin/main`，避免工作丢失。
- **【data.json note 追加修正·2026-11-10 踩坑】**：往 `note` 末尾追加轮次记录时匹配串必须只是 note 值尾部的 `"`（如 `重新对齐。",`），若误把 `"\n\n【…` 也写进 old_string 会把一个字符串切成两段独立 JSON 字符串字面量（中间无 key）导致 `ConvertFrom-Json` 报「应为 : 或 }」。**校验用 PowerShell `ConvertFrom-Json`**（本机 python 不在 PATH，勿用 `python -c`）。
- **【断网自愈机制·必备】push 受阻时启动后台重试循环**（不要用 `&&` 串、PowerShell 不支持；用 `Start-Process -FilePath git -Wait -PassThru` 拿真退出码，proxy→direct 轮换，每 60s 一轮，cap 上千），GitHub 一恢复即自动推送；本机 01:15 轻量轮曾因此卡 4h+ 未推，已沉淀教训。
- **`python` 不在 PATH**（报 Microsoft Store 别名未安装）；做 `json.load` 硬校验须改用 bundled python：`C:\Users\pengz\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe`。
- **【已废弃·勿照抄】token-URL 法**（`git -c credential.helper= push https://user:$(printf ... | awk ...)@github.com/...`）：仅在旧 Git Bash 会话有效；**PowerShell 无 `printf`/`awk`，该命令直接失败**（报 "Invalid username or token"）。旧记忆「Git Bash 直接 push 会挂死、必须 token-URL」「别用 PowerShell 承接 push」在 DSH PowerShell 会话均已失效，别再当铁律。
- 远端内容校验：`Invoke-RestMethod` + 代理 127.0.0.1:7897 读 raw.githubusercontent.com；临时文件下到**仓库内**再删（`/tmp` Windows 版 Python 看不到）。
- 本机↔GitHub 推送间歇性 TLS 握手 EOF 阻断（error:0A000126 unexpected eof）；任何 git push 前 fetch/rebase 失败时应改用代理 http://127.0.0.1:7897 或持续后台重试直至成功，勿误判推送成功（远端未落则网页 updatedAt 不刷新）。
- GitHub `git push origin main` 偶发 `cannot lock ref 'refs/heads/main'` 远端竞态，remote rejected 但 commit 实际已落地＝**假失败**；本机后台重试循环 400 次报告 ok=False 亦曾因此误判，须以 `git fetch origin` 后比对 `git rev-parse HEAD` 与 `git rev-parse origin/main` 相等即推送成功（22:45 轮实证）。勿因 push 返回非成功即重推或误判未推送。
- 历史：2026-11-06 曾有 DSH PowerShell 会话 `git push` 直接成功，2026-11-08 GitHub 链路中断后失效，勿默认沿用。
- **【data.json 误改挽救·2026-11-10 16:26 实证】** 若 _update_data.py 因误写真换行/串位把 data.json 写成非法 JSON，立即 `git checkout HEAD -- data.json` 还原到最近已提交的有效版（HEAD 必为上一轮合法态），再重跑幂等追加；切忌手改巨型 note。note 追加须用转义 `\\n` 且锚定唯一标记 `",\n    "days": [` 而非 `rfind('"')`（后者会落在 note 内已转义 `{\"days\":[]}` 上把串位）。
- 【2026-11-11 16:11 网络状态更正】本机↔GitHub 链路自 ~11/09 02:30 的 TLS EOF(0A000126) 阻断**已于 11/11 16:11 起解除**：git fetch/rebase/push 直连均可成功（origin/main 未领先、rebase 无冲突、push 落地后 HEAD==origin/main）。此前 `_push_retry.ps1` 日志反复报「rebase conflict -> aborted」实为**工作树脏**导致 `cannot rebase: unstaged changes`（循环只 fetch+rebase 从不 commit），非真冲突亦非 TLS。纠正旧记忆「GitHub TLS 持续失败」：下轮先 `git status`，脏树则先 `git add/commit` 清理再 rebase/push；采集侧外网(WTT/ITTF/央视EPG/电视猫/多引擎)仍受限未恢复。

## 单链滚动刷新（once 链）
- 全局仅 1 个 name 含「刷新」的 **once**（recurring 主任务名也含「刷新」，不算）。命名 `刷新链-[YYYYMMDD]-[HHMM]`，`cwds`=`C:/Users/pengz/Documents/GitHub/pingpong-schedule`，**不传 rrule**，带 `modelId=hy3`。
- 时刻（9.2）：赛前 T=K-1h（仅 T∈(now,now+30h]）；赛中整链只加 1 个 now+30min 点；升序后 30 分钟聚类（≤30min 并入取最晚）；取 ≥now+30min 最早簇为 T_next；无候选则暂歇。**`schedule` 不参与计算**。凌晨场（00:00-07:59）真实开赛是次日，K 须修正。
- **`video.json` 里含具体 `time` 且 `note` 未写赛果的场次同样进候选集 C**（央视零转播期它是唯一真实比赛）。「note 已含比分」＝已结束。
- **轻量刷新默认「不碰 video.json」** → 需回填 video 赛果必须在 once 的 prompt 里**显式特批**，否则空跑。
- 对齐时先 list；现存 once 落在 [now±30min] → 不动；否则**先建新再删旧**。

## 数据约定
- days 四日期：昨日（**原样保留**）+ 今日 + 明日 + 后日。risk 仅未结束场填（🔴/⚠️/✅ + 括号大白话标签 + 口语原因，台号写 `央视5`/`央视5+`，2~3 句）；**已填 result 必须移除 risk**。
- **`result` 用取胜者视角**：赢家写在前（即使赢家是 playerAway）。
- **空窗天**整段写入 day 顶层 `dayNote` 纯字符串、`schedule` 置 `[]`；有真实直播的日子不写 dayNote。末尾「下一站…」句内**禁句号**；口诀**「名单句在前、`背景:` 断后」**。
- **【收录口径】** 央视有直播的日子**每天固定 4 场 = 国乒 + 日本焦点**，其余在早报正文列全；**收官日例外**：决赛对阵落位后必须扩进当日 `matches`。
- **`schedule` 只在 `matches` 为空的 else 分支渲染**（app.js:1975-2008）→ 有 matches 的日子加 schedule 是死内容。推论：某日部分对阵待定时**宁可留 `schedule`**，别只写已定的几场 matches。
- **`nextEvent.note` 追加文本禁用 `→`**；**新段落必须插在首句第一个 `。` 之后**（首句括号是 `parseEventMeta` 的 title 锚点）。
- video.json 顶层仅 `days[]`，用 `platform`；**不渲染 result** → 赛果写进 `note`。团体赛按 5.3.1。

## 前端判据
- **【换站必读】`nextEvent` 换站时必须「名单句在前、`背景:` 断后」**：`parseNextRoster` 缺席段靠 lookahead `[,;。]\s*(出战|国乒|赛程|背景…)` 收尾，收不住会把整段采集日志当缺席名单（实测 39~82 条垃圾）。
- **`rosterFromNextEvent` 有 `isNextEventStarted` 闸门**：下一站未开赛 → 名册返回空，不会串名单。
- **渲染层 `<section>` 计数随 nextEvent 是否在窗口内变化（9/18 定案）**：nextEvent **在窗口外** → 昨日无 matches 时＝4、昨日有 matches 时＝5（9/14-9/17 的常态）；nextEvent **落在窗口内**（如 9/20 亚运首日入窗后 nextEvent.date 与 days 末日重合）→ **「下一站」卡隐藏**，昨日无 matches 时**＝3**。信息不丢，改由该日 `dayNote` 的「下一站」句承载。测试不写死 section 数。
- **测试禁写死「站次」**：名册人数/性别/淘汰名单/nextEvent.date/fixture 日期一律以 `computeSurvival`、`isNextEventWithinWindow`、相对 `new Date()` 动态推导。
- **【铁律】`risk` 禁写「电视看不到」类词**：`riskSaysNoTV` 命中 `手机|APP|app|客户端|咪咕|央视频|不直播|电视上不播|电视不播|只在.*播|只在.*看` → **整场从页面消失**。移到早报与 note。**risk 须按当前时刻复核**。
- ⚠️ `tag--soon` 也是「明天/后天」标签默认 class，自检要看 `day--next`。窗口内有赛事时 `day--next`/`emeta__rank-item`/`next__lines` 归零**属正常**。
- **【stage 拆层】** `stage` 是「标题主体 + 补充说明」复合字段，前端 `parseStageDetail` 只把第一个括号外片段放标题 pill，其余成 `.match__stage-detail`。
- 昨日 `matches` 为空 → 该日整段不可见。视频块只在「当日无央视直播」分支渲染。渲染层 `vmatch__` 计数＝场次数×6。

## 自检两层必做
① 解析层 `api.parseDayNote`（括号配对、**要点最长 ≤100 字**、`nextSquad`/`nextAbsent` 数量）。
② 渲染层 `buildAbove(api.prepareCtx(d,{now})) + buildBelow(ctx,d)`。
- `mergeVideo` 可能返回 undefined → `(r&&r.days)?r:data` 兜底；`parseNextEventNote` 必须传 `.note` 字符串。
- 要点超长时在采集端**拆句号**，不动 app.js（9/16 轮 9/17、9/18 各拆一处）。
- 「N 天后」假数据一律相对 `new Date()` 动态算；判「今天」用本地日期拼接，**禁用 `toISOString().slice(0,10)`**。
- 视觉验证走 CDP，别用 `--screenshot`；溢出只看 `scrollWidth === clientWidth`。详见 `前端自检细则.md`。

## 采集环境
- **epg**（直播时间一手权威）：`sports.cctv.com/epg/index.shtml?channel=cctv5|cctv5plus|cctv16&date=YYYY-MM-DD`。同日 5 与 5+ 窗口可能不同。
- **逐场对阵/成绩权威源**：主办方官网新闻稿（澳门＝gov.mo 编号稿）> 央视网体育官方战报 + **直播吧逐局成绩页**（`news.zhibo8.com/other/YYYY-MM-DD/matchXXXXXXXvnative.htm`）> 门户。⚠️ gov.mo 编号页会整段 404（9/13 起 1265583 之后全挂）→ 回退央视网 + 直播吧并披露。
- 黑名单：sports.sina.com.cn/pingpang、sports.163.com/pingpang、s.weibo.com、so.toutiao.com、sports.sina.cn 首页聚合稿、k.sina.cn、搜狐 1071907758、**cnyouth.com**（错时间戳/旧稿）、网易号「乒乓乐园」。
- **「标题党」陷阱**：标题写「XX 力克 YY」但正文是「如果…就…」式前瞻＝**不是赛果**，必读正文再判。AI 体例聚合稿（「结论:」式、无一手源）同理。
- `WebFetch tv.cctv.com/live/cctv5plus/` 自 9/1 失效。
- 本机未安装 python（调用报「Python was not found」），采集说明 7.2 的 JSON 硬校验 `python -c "import json..."` 不可用；改用 PowerShell `ConvertFrom-Json` 或 `node -e JSON.parse` 校验 data.json/video.json 合法性。

## 真伪判定
- **【铁律】结论与依据分开判定**：依据错只否定依据，结论另行求证。
- 矛盾先查是否描述不完整；**比分顺序先镜像校验**；**时刻取多数**，少数派留痕；量化数字打架只写定性。
- 大比分打架以**逐局列表**为准，只在早报「未采信」留痕。权威优先级：央视网/奥林匹克频道 > @WTT世界乒联 > 新华社 > 腾讯/搜狐/体坛周报。
- **分层判「源」**（9/15 定案）：关键事实（有没有这场、对手是谁）要 4 源；次要事实（几点开打）2~3 源 → 按规范 2.2 **照写**并加 note 证据提示。只有「连对手都没定」或「时刻仅 1 源」才留空。
- 条件场作废：上轮「若 A 胜则…」本轮必复查。终局后 5~15 分钟发稿 → 开赛超 1 小时仍未发＝仍在进行。
- **命中即判错**：亚运写成「杭州亚运会」（实为日本爱知·名古屋）；澳门站名单出现温瑞博/向鹏/林诗栋；「537 万/2000 积分」＝大满贯口径；同稿内时差 ≠ 6 小时。
- 单源新事实不写 matches，改在 note 以「仅 N 源、待复核」披露。
- **【分区表可反证对手 · 9/17 定案】** 判断「某人首轮对手是谁」时，**优先用官方分区/签表做结构性校验**：种子在首轮轮空，所以「A 是 X 区种子」与「A 是某人首轮对手」不能同时成立（9/17 据此把李天阳对手由泊雷特更正为力廉·巴德）。另：**「多数稿一致」可能只是同一稿系被多家转载**（腾讯一稿＋网易转载＝1 源），数源数要数**独立编辑/独立域名**。**【结构性校验·9/18 定案】「已被淘汰的对手不会出现在下一轮」可反证串位**：9/18 陈俊菘/王艺迪混双1/4 的对手，多数稿写「莫维利亚努/德拉戈曼」，但这正是他们 9/17 在 1/8 淘汰出局的对手 → 判串位，取签表结构的阿尔乔缅科/阿布拉米安。
- **【签表 vs 逐场时刻分开判定】（9/16 定案）**：正赛签表（分区/首轮对手/谁轮空）常可 4 源确认 → 写进 dayNote；**逐场开赛时刻常 0 源 → video.json 一律不写**。公众号「X日X点 A vs B」式清单常常与官方签表冲突（轮空种子被写成有比赛、跨区乱配），属 AI 体例聚合稿，不采信。
- **官方公示 vs 黑名单单源**（9/15 定案）：两头都要防——官方旧名单会过期（王晓彤外卡案 9/14 翻案），黑名单单源会骗人（亚运男双案 9/15 翻案）。**定案看「官方原文 + 独立源数」，且每轮重估。**

## 赛事背景（指针，细节见早报/data.json）
- **WTT 澳门冠军赛 9/8-13 已收官**（女单 张本美和 4-3 陈熠；男单 莫雷加德 4-1 雨果）。见 `早报/2026-09-13.md`。
- **阿斯塔纳球星赛 9/15-20** 哈萨克斯坦，WTT600，央视零转播·咪咕独家，国乒 19 人（陈幸同退赛）。赛程：9/15-16 资格赛 → 9/17 32强 → 9/18 1/8 → 9/19 1/4 → 9/20 半决赛+决赛（除决赛七局四胜外均五局三胜）。video.json 已写 9/17(19)/9/18(21)/9/19(7) 共 47 场（9/19 赛果待回填）。王艺迪身兼三项。
- **【八·乙 边界】**「有真直播必须写 video.json」**不等于可以凑对阵**：对手未定或时刻仅 1 源时留空 + note 留痕。**但边界不是永久的**——每轮都要重估「对阵/时刻是否已公布」（9/15 首次突破「对阵」；**9/17 09:45 突破「逐场时刻」**：01:11 轮还只有 1 源，09:45 轮冒出腾讯×2/搜狐×2/网易三域名 → 立即写入 19 场）。**教训：上一轮的「源数不足」结论绝不能沿用，每轮从零重数。**
- **亚运会乒乓 9/20-28** 日本名古屋·丰田天空体育馆，7 金，央视5/5+ 转播（CCTV-16 未承接），9/19 开幕。国乒 10 人（男 王楚钦/林诗栋/温瑞博/向鹏/黄友政；女 孙颖莎/王曼昱/陈熠/蒯曼/范姝涵；缺席 樊振东/梁靖崑/陈幸同/王艺迪/周启豪）。抽签 9/18 北京12:30 完成：男团A组 中国/卡塔尔/中国澳门，女团A组 中国/中国澳门/尼泊尔。决赛时刻(9/14四源)：9/24 男团16:00+女团18:30、9/26 混双18:30、9/27 男双18:00+女单19:30、9/28 女双18:00+男单19:30。男双配对维持 林诗栋/温瑞博+黄友政/向鹏（官方原文可核实优先）。国乒住名古屋港邮轮「歌诗达赛琳娜号」。
- **亚运男双 维持 林诗栋/温瑞博 + 黄友政/向鹏**（9/17 第五次复核回退后定案，9/18 抽签未变）。判据＝官方原文可核实性优先于「据称的更新时间」：ctta.cn 6/25 公示与 TEAM CHINA 9/15 海报均可打开核实写此版；「亚运官网 9/11 改林诗栋/黄友政」始终无法打开核实，且独立源数 8 对 5。
- **阿斯塔纳正赛首日 9/17 已写入 video.json（19 场）**：14:00 覃予萱/纵歌曼 → 23:30 李天阳 vs 力廉·巴德（已据签表勘误，泊雷特系串位）。9/18(21)/9/19(7) 亦已写入。
- **当前窗口状态（9/17 起）**：四日期 09-16(昨)+09-17(今)+09-18(明)+09-19(后)，**连续第六个空窗日**（仅澳门站录像/巴黎奥运回看）；nextEvent 指向亚运 9/20（daysAway=3）。9/19 已于本轮入窗建 dayNote。**9/19 那轮必须查 9/20 epg 拿亚运乒乓直播台号**（9/20 四查仍只有泛化条目：C5 08:00/11:30 赛事转播报道＋21:30 全景亚运，C5+ 与 C16 各 08:55「赛事直播1/报道1」，中午到傍晚整段空白）。
- **阿斯塔纳资格赛已收官（9/16）：国乒 12 胜 2 负**，男单仅徐瑛彬/李天阳进正赛，女单韩菲儿/姚睿轩/朱思冰全突围，双打 4 对进正赛。9/17 逐场时刻凑够 3 域名 → 19 场入 video.json。
- **紧邻赛历**：阿斯塔纳 9/15-20 → 亚运 9/20-28 → 中国大满贯 10/1-11 北京 → 亚锦赛 10/19-25 塔什干 → 总决赛 12/9-13 香港。
- 译名归一见 `name_alias.md`（西多伦科=希德仁科；林钟勋=林仲勋；A·勒布伦=艾利克斯·勒布伦；梅谢芙=梅瑟夫；安娜·赫希=赫尔希）。

## 采集铁律补充
- 央视 CCTV 节目单常赛前临时加播/换台（如 11/07 早间判斯诺克、晚 20:00 改 WTT 1/4 决赛直播），晚场直播判定须在赛前约 1h 重新拉 api.cntv.cn 三台 EPG，勿沿用早间快照或上一轮结论。
- 【EPG 接口·竖线分隔被拒】api.cntv.cn/epg/epgInfo 的 c 参数必须用逗号分隔（cctv5,cctv5plus,cctv16）；竖线 `|` 返回 `{"errcode":"1001","msg":"params error"}`（39B 空壳，无节目数据）。2026-11-12 当日日志误记竖线可用，以本条目为准。正文页 sports.cctv.com/epg 仍返 JS 壳无网格数据，判定直播不可用此页。
- 【EPG 接口·整段缓存回放壳·2026-11-13 实测】api.cntv.cn/epg/epgInfo 还会**跨日期返回字节完全相同的陈旧缓存体**：11/13-11/15 三日均返 19875 字节、`isLive` 锚定「世界泳联游泳世界杯 阿塞拜疆站」、66 行全为「实况录像/奥林匹克典藏回放」且 `date` 参数未生效。判据：若多日期 payload 长度相同且 `isLive` 非乒乓，即视为缓存壳、**不可据此判「有直播」**；空窗判定改以「可检索节目全为录像/回放、零 LIVE 乒乓行」兜底，并在 data.json note 留痕。解析须用 `program[]`(`t`=时刻/`title`/`columnName`)，旧 `list[]` 结构已失效（会 TOTAL=0 假阴性）。