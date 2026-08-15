# -*- coding: utf-8 -*-
import json

path = r"C:\Users\pengz\Documents\GitHub\pingpong-schedule\data.json"
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

new_seg = ("【2026-08-15 17:43 主任务全量早报·编排器并行自采降级(网易163 S1/搜狐 S2/腾讯new.qq S3/"
           "今日头条 S4/微博WTT S5/央视频赛程 S6/央视节目单 S7 共7独立域)】窗口 08-15 08:00~08-16 08:00。"
           "采集结论:①8/15 CCTV-5 18:00-21:00 五场(QF+女双决赛)经7独立源零冲突确认、与现有data.json完全一致"
           "——18:00王曼昱vs彭郁涵(中国台北)、18:45达科vs阿萨尔(男单)、19:30王艺迪vs石洵瑶(国乒内战)、"
           "20:15 A.勒布伦vs张本智和、21:00女双决赛张本美和/早田希娜vs杜凯琹/吴咏琳;央视5约21:30《体育世界》前块结束、"
           "无插播,全标✅低。②8/16凌晨5场(00:00男双决赛+4场QF)央视电视不直播仅央视频/咪咕,全标⚠️中,经S1~S6一致确认。"
           "③8/16 18:00单打SF+8/17 00:00决赛(pending,对阵待今夜QF赛果放出后回填)维持。④链断修复:旧刷新once"
           "「刷新链-20260815-1700」(17:00)已过期且data未更新(updatedAt仍09:41),按铁律判定静默失败,"
           "本次主任务真刷新并对齐单链。updatedAt改17:43。\n")

data["updatedAt"] = "2026-08-15 17:43"
data["note"] = new_seg + data.get("note", "")

with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# validate
with open(path, "r", encoding="utf-8") as f:
    json.load(f)
print("OK updatedAt=", data["updatedAt"], " note_len=", len(data["note"]))
