# 刷新链-20260814-1820 执行摘要(继承自 1735 跳)

## 本跳(17:35)已完成
- 窗口 08-14 18:00~次日02:50 赛程经 7 域(网易/腾讯/新浪/头条/虎扑/微博/体坛周报)一致确认无误;无终场赛果(最早 18:00 未开打)。
- data.json 仅 updatedAt 17:00→17:35(静默失败铁律满足);result/risk/time/channel 原样保留;subtitle 不变;四日期结构不变(昨日 8-13 战报原样)。
- 推送 origin main 两次提交:42f6493(compact) + 14cff2c(pretty 归一化)。
- 链:删 1735(1786698307745)建 1820(本 once, 1786700480072, 18:20, hy3)。全局仅 1 个刷新 once。

## 关键坑(务必记牢)
1. **data.json 改写必须单链唯一**:本跳首次因 /tmp/update_data.py 残留旧脚本被误执行,把 data.json 覆写成旧「2026-08-13 09:11」状态。已用 `git checkout -- data.json` 从 HEAD(0cdf29c)恢复。→ 改写脚本一律用工作区内唯一文件名(如 _fix_HHMM.py),勿用 /tmp 常见名;改完校验 updatedAt 变更且 JSON 合法。
2. **json.dump 默认单行**:会触发 742 行 diff 噪声。统一用 `json.dump(d, f, ensure_ascii=False, indent=2)` 保持 pretty 格式,与仓库约定一致。
3. **凌晨场日期修正**:time<"08:00" 的场写在「今日」date 下,真实 K=所属 date 次日+time;赛中候选区间 [K-30min, K+3h] 含开赛前30分钟。
4. **单回合自动化无法回收 subagent SendMessage 结果** → 采集走「编排器自采降级」(一次性并行 WebSearch/WebFetch),不派 subagent。
5. **updatedAt 铁律**:更新后若与执行前相同=静默失败,必须立即补建下一跳 once 重刷。

## 下次(18:20)预期
- 18:00 混双SF(林诗栋/蒯曼 vs 林昀儒/郑怡静)应已开打/可能接近结束,是首条可捕获赛果/进行中比分的场。
- 若无赛果则继续守成,updatedAt 推进,重算 T_next(下一场 19:20 王艺迪vs大藤沙月赛前候选 18:20 已消耗,下一簇约 19:05)。
