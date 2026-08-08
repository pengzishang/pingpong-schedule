# 项目记忆: pingpong-schedule 央视乒乓赛程刷新

## 单链滚动刷新机制(「轻量刷新」once 链)
- 全局同时仅 1 个 name 含「刷新」的 once 任务;旧链删除后再建新链,保证唯一。
- 每次运行:读 data.json → 并行采集(4组 subagent 扇出;降级则编排器自采) → 串行交叉认证 → 更新 data.json(只改 result/risk/time/channel/schedule,保留四日期与昨日战报,subtitle 维持) → git add/commit/push(origin+gitee) → 按「刷新时刻计算」新建下一个 once 并删除旧的。
- 刷新时刻计算:赛前候选 T=K-1h(K=date+time,仅 T∈(now,now+30h] 入选);赛中候选整链只加 1 个 now+30min 轮询点;候选升序后 30 分钟聚类合并(≤30min 并入同簇取最晚,>30min 另起簇);取 ≥now+30min 最早簇为 T_next。无候选则不建(链暂歇,等 8h 主任务重新对齐)。
- next once: name=刷新链-[YYYYMMDD]-[HHMM]、modelId 必须 hy3、cwds=仓库根、scheduledAt=ISO8601+08:00、prompt 完整照搬 FINAL 模板(含单链逻辑)。

## git 推送
- origin(github.com/pengzishang/pingpong-schedule)正常推送。
- gitee(gitee.com/pengzishang/pingpong-schedule)常因网络出口受限挂起:先 `git config http.lowSpeedLimit 1` 与 `http.lowSpeedTime 45`,再后台重试;仍失败留待下次主任务补推,不要无限等待。
- 提交信息格式:`赛程刷新_YYYY-MM-DD_HH:MM`。

## 数据约定
- days 四日期:昨日(带 result 战报)+ 今日 + 明日 + 后日。
- 未结束场 risk:以 🔴高风险 / ⚠️中风险 / ✅低风险 开头,括号大白话标签;⚠️ 另起一句写证据可靠性;📊 另起一句写人头对战;整段 2~3 句。
- 已结束写精简比分(含小分局分)。subtitle 固定「央视直播 · 乒乓球赛程 · 每日更新(可筛选 全部/国乒/日韩)」。

## 环境备注
- 央视EPG(api.cntv.cn)常失效、WTT官网 JS 墙、咪咕乒乓页 404、电视猫频道页需具体 slug;主要依赖新闻聚合(新浪/腾讯/网易/搜狐/今日头条/央视网)交叉确认。
- 单回合自动化无法回收后台 subagent 的 SendMessage 结果,采集走「编排器自采」降级路径更可靠。
- 数据中 蒯曼vs早田希娜赛事 18:15 开打,但央视5于 18:00-18:30 播《体育新闻》,电视 18:30 才接播。
