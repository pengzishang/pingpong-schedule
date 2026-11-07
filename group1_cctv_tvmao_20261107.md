# 组①采集汇报：央视官网 EPG + 电视猫节目单（权威源）
采集时点：北京时间 2026-11-07 00:08 起。仅报本组来源（央视系 EPG + 电视猫）能查到的事实。

## 0. 来源、抓取方法与可信度（务必先读）

- **【抓不到→已绕过】** `sports.cctv.com/epg/index.shtml?channel=...&date=...` 页面是 **JS/JSONP 动态渲染**，`web_fetch` 只拿到导航框架、栏目列表、热播榜，**节目单本体抓不到**（如实披露）。
- **【已核实·一手】** 逆出该页调用的数据接口 `https://api.cntv.cn/epg/getEpgInfoByChannelNew?c={cctv5|cctv5plus|cctv16}&serviceId=pcsports&d={YYYYMMDD}&t=jsonp&cb=cb`，成功取回 **3 频道 × 4 天（20261106/07/08/09）完整 JSON 节目单**。这才是央视官网 EPG 的真实底层数据，本汇报主要依据它。日期格式必须是 `YYYYMMDD`（带横杠 `2026-11-07` 返回 `errcode:1001 url error`）。
- **【已核实·交叉】** 电视猫 `www.tvmao.com/program/` 周视图：`-w5`=周五 11/06、`-w6`=周六 11/07、`-w7`=周日 11/08、`-w8`=下周一起 11/09。三频道（CCTV-CCTV5 / CCTV-CCTV5-PLUS / CCTV-CCTVOLY）逐条与央视接口吻合 → 关键结论 **双源确认**。
- **【抓不到】** `m.tvmao.com` 移动版首页/分类页可访问，但 `m.tvmao.com/program/CCTV5.html` 返回的是 **CCTV-1 通配回退页**（标题「CCTV-1综合节目表」），无有效 CCTV5 数据；`www.tvmao.com/program/CCTV5-w1.html` 等旧式 URL 均 404。已改用上面周视图 URL。
- **【甄别 2025 旧稿】** 全部条目均含「**WTT法兰克福冠军赛2026**」明确年份；央视/电视猫均为 2026 年 11 月当周实时 EPG（赛事 11/3–8），**不是** 2025 年（11/4–9）旧稿。搜索中出现的 2026-11-02 网易稿「11月2日至8日」亦为 2026 当年稿，非旧稿。
- **【直播 vs 录播判据】** 标题含「实况录像 / 实况录像（奥林匹克）/ 奥林匹克典藏 / 集锦 /（录播）/ 录播」= **录像/录播**；直接赛事名且无上述前缀 = **直播转播**。
- **【非本组来源】** 搜索命中的新浪/网易/腾讯/懂球帝/央视频赛程页等均**不计入**本组权威结论，仅作背景。特别是「咪咕是否独播」不在本组可核实范围。

## 1. 乒乓球直播时段清单（核心）

### 2026-11-06（周五）实播回顾 —— 对应任务第 2 点
| 时段 | 频道 | 节目（EPG 原文） | 性质 |
|---|---|---|---|
| 20:10–20:35 | CCTV-5 | 实况录像-WTT法兰克福冠军赛2026 男单1/8决赛（录播） | **录播**（垫场） |
| 20:35–22:00 | CCTV-5 | **WTT法兰克福冠军赛2026-1/8决赛**（85min） | **✅ 直播·已核实** |
| 22:00–23:05 | CCTV-5 | 体育世界（65min） | 固定栏目 |
- **结论：11/6 20:35–22:00 CCTV-5 确直播了 WTT 法兰克福 1/8 决赛，22:00 后接《体育世界》，两点均成立。** 电视猫 w5 记 20:37 起（与央视 20:35 差 2 分钟，属 EPG 取整差，不影响结论）。
- 来源：央视EPG接口 [c=cctv5&d=20261106](https://api.cntv.cn/epg/getEpgInfoByChannelNew?c=cctv5&serviceId=pcsports&d=20261106&t=jsonp&cb=cb) ＋ 电视猫 [CCTV-CCTV5-w5.html](https://www.tvmao.com/program/CCTV-CCTV5-w5.html)
- 同日 CCTV-5+ / CCTV-16 全天无 WTT 直播。

### 2026-11-07（今日·周六）—— 对应「11/7 的 1/4 决赛央视到底转不转」
- CCTV-5 **10:00–11:00「实况录像-WTT法兰克福冠军赛2026 单打1/8决赛（录播）」= 录播**（是 **1/8** 决赛录像，**不是 1/4**，更不是直播）。〔[央视接口 cctv5/20261107](https://api.cntv.cn/epg/getEpgInfoByChannelNew?c=cctv5&serviceId=pcsports&d=20261107&t=jsonp&cb=cb)〕〔[电视猫 CCTV-CCTV5-w6.html](https://www.tvmao.com/program/CCTV-CCTV5-w6.html)〕
- CCTV-5 晚间硬时段：**20:00 斯诺克国际锦标赛-决赛 第二阶段（150min）**、**23:00 英超第10轮 阿森纳—赫尔城**；18:40 花滑双人自由滑。〔同上两源〕→ 与「11/6 显示 11/7 CCTV5 是斯诺克决赛+英超」一致。
- CCTV-5+ 11/7：14:00 斯诺克国际锦标赛-决赛 第一阶段、21:30 ATP1000 巴黎站 半决赛，**全天无 WTT/乒乓**。〔[央视接口 cctv5plus/20261107](https://api.cntv.cn/epg/getEpgInfoByChannelNew?c=cctv5plus&serviceId=pcsports&d=20261107&t=jsonp&cb=cb)〕〔[电视猫 CCTV-CCTV5-PLUS-w6.html](https://www.tvmao.com/program/CCTV-CCTV5-PLUS-w6.html)〕
- CCTV-16 11/7：23:10「奥林匹克典藏-巴黎奥运会 乒乓球混双决赛」= **奥运典藏录像，非本届赛事**；全天无 WTT 直播。〔[央视接口 cctv16/20261107](https://api.cntv.cn/epg/getEpgInfoByChannelNew?c=cctv16&serviceId=pcsports&d=20261107&t=jsonp&cb=cb)〕〔[电视猫 CCTV-CCTVOLY-w6.html](https://www.tvmao.com/program/CCTV-CCTVOLY-w6.html)〕
- **✅ 已核实结论：11/7 的 1/4 决赛，CCTV-5 / CCTV-5+ / CCTV-16 三台 EPG 上完全没有直播，连「1/4 决赛」字样的录播都没有（全天唯一 WTT 条目是 10:00 的 1/8 决赛录播）。双源一致。**
- **⚠️ 存疑/范围外**：是否「改由咪咕独播」——本组来源只能证明「央视 EPG 无此直播」，**无法证实咪咕独播**（咪咕不属央视系/节目单来源，不采信聚合稿为结论）。

### 2026-11-08（明日·周日）—— 对应「半决赛 18:25 是否仍成立」
- **CCTV-5 18:25–21:55「WTT法兰克福冠军赛2026-半决赛」（210min）= ✅ 直播·已核实，18:25 成立。** 21:55 接英超第10轮 水晶宫—利物浦。〔[央视接口 cctv5/20261108](https://api.cntv.cn/epg/getEpgInfoByChannelNew?c=cctv5&serviceId=pcsports&d=20261108&t=jsonp&cb=cb)〕〔[电视猫 CCTV-CCTV5-w7.html](https://www.tvmao.com/program/CCTV-CCTV5-w7.html) 明确列 18:25 同名条目〕
- CCTV-5+ 11/8：22:00 ATP1000 巴黎站 决赛，**无 WTT 直播**。〔[央视接口 cctv5plus/20261108](https://api.cntv.cn/epg/getEpgInfoByChannelNew?c=cctv5plus&serviceId=pcsports&d=20261108&t=jsonp&cb=cb)〕
- CCTV-16 11/8：23:10「奥林匹克典藏-巴黎奥运会 乒乓球混双决赛」= 录像；**无 WTT 直播**。〔[央视接口 cctv16/20261108](https://api.cntv.cn/epg/getEpgInfoByChannelNew?c=cctv16&serviceId=pcsports&d=20261108&t=jsonp&cb=cb)〕

### 2026-11-09（后日·周一）—— 对应「凌晨决赛央视转不转、哪个台」
- **CCTV-5 00:30–03:05「WTT法兰克福冠军赛2026-决赛」（155min）= ✅ 直播·已核实，台号 CCTV-5。** 注意比提问中的「00:30–01:30」长，实际排到 **03:05**。〔[央视接口 cctv5/20261109](https://api.cntv.cn/epg/getEpgInfoByChannelNew?c=cctv5&serviceId=pcsports&d=20261109&t=jsonp&cb=cb)〕〔[电视猫 CCTV-CCTV5-w8.html](https://www.tvmao.com/program/CCTV-CCTV5-w8.html) 明确列 00:30 同名条目〕
- CCTV-5 19:30–20:30「实况录像-WTT法兰克福冠军赛2026 比赛 1」= **录播**（当晚重播）。〔同上两源〕
- CCTV-5+ 17:29–18:30「实况录像-WTT法兰克福冠军赛2026 比赛 1」= **录播**；凌晨无直播。〔[央视接口 cctv5plus/20261109](https://api.cntv.cn/epg/getEpgInfoByChannelNew?c=cctv5plus&serviceId=pcsports&d=20261109&t=jsonp&cb=cb)〕〔[电视猫 CCTV-CCTV5-PLUS-w8.html](https://www.tvmao.com/program/CCTV-CCTV5-PLUS-w8.html)〕
- CCTV-16 22:40「奥林匹克典藏-东京奥运会乒乓球男子单打决赛」= 录像；**无 WTT 直播**。〔[央视接口 cctv16/20261109](https://api.cntv.cn/epg/getEpgInfoByChannelNew?c=cctv16&serviceId=pcsports&d=20261109&t=jsonp&cb=cb)〕
- **结论：11/9 凌晨决赛仅 CCTV-5 直播；CCTV-5+ / CCTV-16 均不直播，白天/晚间只有录播或奥运典藏。**

## 2. 固定栏目时刻（《体育新闻》《体坛快讯》《体育世界》，用于插播风险判定）

> 这三档是 **CCTV-5 独有**；CCTV-5+ / CCTV-16 四天 EPG 中均未出现这三档栏目。
> 来源（每行同）：央视EPG接口 [c=cctv5 & d=对应日](https://api.cntv.cn/epg/getEpgInfoByChannelNew?c=cctv5&serviceId=pcsports&d=20261107&t=jsonp&cb=cb) ＋ 电视猫 [CCTV-CCTV5-w5..w8.html](https://www.tvmao.com/program/)。

| 日期 | 频道 | 体坛快讯 | 体育新闻 | 体育世界 |
|---|---|---|---|---|
| 11/06 周五 | CCTV-5 | 12:00（35min） | 17:30（35min） | **22:00（65min）** |
| 11/07 周六 | CCTV-5 | 12:00「体坛快讯-2026.11.7」（**仅15min**，12:15 接 NBA 杯赛） | 18:20（20min） | **无** |
| 11/08 周日 | CCTV-5 | 12:00（35min） | 17:55（30min） | **无** |
| 11/09 周一 | CCTV-5 | 12:00（35min） | 18:00（30min） | **21:30（65min）** |

**插播风险判定：**
- **11/8 半决赛 18:25–21:55：✅ 无插播风险。** 前接 17:55–18:25《体育新闻》正好让位开赛；直播窗口内无任何固定新闻栏目插入；21:55 直接转英超。
- **11/9 凌晨决赛 00:30–03:05：✅ 无插播风险。** 凌晨无任何固定栏目。
- 11/9 19:30 录播（19:30–20:30）与 21:30《体育世界》不重叠，无冲突。
- 11/7 10:00 录播（10:00–11:00）与 12:00 体坛快讯不重叠；若临时加插 WTT，最可能被 12:00 体坛快讯 / 18:20 体育新闻 切断，且 20:00 斯诺克决赛、23:00 英超为硬时段——但**当前 EPG 无任何 1/4 决赛安排**。
- 11/6 回顾：20:35 直播被 22:00《体育世界》准时切断（85min 窗口），与 EPG 完全吻合。

## 3. 已核实 / 抓不到 / 存疑 汇总
- **已核实（双源：央视EPG接口＋电视猫）**：11/6 20:35 1/8 决赛直播＋22:00 体育世界；11/7 三台全天无 1/4 决赛直播（仅 10:00 1/8 录播）；11/8 18:25 CCTV-5 半决赛直播；11/9 00:30 CCTV-5 决赛直播（到 03:05）；四天 CCTV-5 三个固定栏目时刻；CCTV5+/16 均无 WTT 直播。
- **抓不到（已如实说明并绕过）**：`sports.cctv.com/epg/index.shtml` 页面本体 JS 动态渲染，直抓无节目单 → 改由其 JSONP 接口取数；`m.tvmao.com/program/CCTV5.html` 为 CCTV-1 回退页，无效 → 改用 www.tvmao.com 周视图。
- **存疑 / 范围外**：①「11/7 是否咪咕独播」本组无法证实（只能证「央视无」）；② 电视猫 `-w8` 是「下周」入口、URL 不含日期，靠其内容与央视 11/9 接口逐条吻合（00:03 布鲁塞尔站 25 分钟版、00:30 决赛、17:29/19:30 录播、22:40 东京奥运典藏）锁定为 11/09；周视图会随时间滚动；③ EPG 阶段名只写「1/8决赛/半决赛/决赛/比赛」，未出现「1/4决赛」字样，「11/7 无 1/4 决赛」是按「全天无任何 WTT 直播条目」推得；④ 央视接口 `isLive` 字段在 11/7 cctv5 指向「国际自盟场地自行车世锦赛-1（4K）」凌晨直播，与乒乓无关。

## 4. 来源 URL 全集
- 央视官网 EPG 页（模板，9 组，页面本体动态渲染）：`https://sports.cctv.com/epg/index.shtml?channel={cctv5|cctv5plus|cctv16}&date={2026-11-07|2026-11-08|2026-11-09}`
- **央视官网 EPG 一手数据接口（本汇报实际取数）**：`https://api.cntv.cn/epg/getEpgInfoByChannelNew?c={cctv5|cctv5plus|cctv16}&serviceId=pcsports&d={20261106|20261107|20261108|20261109}&t=jsonp&cb=cb`
- 电视猫央视节目单索引：https://www.tvmao.com/program/
- 电视猫 CCTV-5：https://www.tvmao.com/program/CCTV-CCTV5-w5.html (11/6) / `-w6.html` (11/7) / `-w7.html` (11/8) / `-w8.html` (11/9)
- 电视猫 CCTV-5+：https://www.tvmao.com/program/CCTV-CCTV5-PLUS-w6.html（w5~w8 同理）
- 电视猫 CCTV-16：https://www.tvmao.com/program/CCTV-CCTVOLY-w6.html（w5~w8 同理）
- 电视猫移动版：https://m.tvmao.com/ （首页可用）；https://m.tvmao.com/program/CCTV5.html （回退页，无效）
- 原始数据落盘：`epg_dump.txt`（央视接口 3×4 天全量）、`tvmao_CCTV*_w*.html`（电视猫抓页），均在本 workspace。
