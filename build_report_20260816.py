# -*- coding: utf-8 -*-
"""全量早报数据构建脚本(2026-08-16 主任务·编排器)。
读现有 data.json,做窗口平移 + 补录已结束场次赛果 + 刷新 updatedAt/note。
仅本脚本写文件(主任务写 data.json 的唯一出口)。"""
import json

PATH = r"C:\Users\pengz\Documents\GitHub\pingpong-schedule\data.json"

with open(PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

# ---- 1. 移除两天前的 8/14(窗口平移:昨日=8/15) ----
data["days"] = [d for d in data["days"] if d["date"] != "2026-08-14"]

# 建立按日期索引
by_date = {d["date"]: d for d in data["days"]}

# ---- 2. 8/15(昨日)晚间5场:补录赛果,清 live/risk ----
d15 = by_date["2026-08-15"]
for m in d15["matches"]:
    if m["time"] == "19:30":  # 王艺迪 vs 石洵瑶
        m.pop("live", None)
        m.pop("risk", None)
        m["result"] = "王艺迪 4-0 石洵瑶 (11-5/11-9/11-7/11-9)"
        m["sources"] = 7
    elif m["time"] == "20:15":  # A.勒布伦 vs 张本智和
        m.pop("risk", None)
        m["result"] = "张本智和 4-0 艾利克斯·勒布伦 (11-9/11-7/13-11/15-13)"
        m["sources"] = 7
    elif m["time"] == "21:00":  # 女双决赛
        m.pop("risk", None)
        m["result"] = "张本美和/早田希娜 3-1 杜凯琹/吴咏琳 (11-6/9-11/13-11/11-9)"
        m["sources"] = 7

# ---- 3. 8/16(今日)凌晨5场:补录已结束赛果,保留未开赛 risk ----
d16 = by_date["2026-08-16"]
for m in d16["matches"]:
    if m["time"] == "00:00":  # 男双决赛
        m.pop("risk", None)
        m["result"] = "A.勒布伦/F.勒布伦 3-0 黄镇廷/陈颢桦 (11-7/11-8/14-12)"
        m["sources"] = 7
    elif m["time"] == "01:00":  # 陈熠 vs 张本美和
        m.pop("risk", None)
        m["result"] = "张本美和 4-0 陈熠 (11-1/11-6/12-10/11-7)"
        m["sources"] = 7
    # 01:45 / 02:30 / 03:15 截至01:42未开赛,保留 risk(交给刷新链补)

# 8/16 schedule:更新为收官日(半决赛+决赛)说明
d16["schedule"] = [
    {
        "time": "00:00-03:15",
        "channel": "央视频/咪咕",
        "tournament": "WTT欧洲大满贯瑞典站",
        "content": "【凌晨网络端·央视电视不直播】男双决赛(00:00 勒布伦兄弟3-0黄镇廷/陈颢桦,法国夺冠)+ 4场单打1/4决赛:01:00 张本美和4-0陈熠(国乒女单陈熠出局)、01:45 松岛辉空vs拉内弗、02:30 蒯曼vs早田希娜、03:15 F.勒布伦vs雨果。央视深夜不电视转播,仅央视频APP/咪咕视频全程网络直播。"
    },
    {
        "time": "18:00-",
        "channel": "CCTV-5 / CCTV-5+",
        "tournament": "WTT欧洲大满贯瑞典站",
        "content": "收官决战日·单打半决赛(CCTV-5+ 18:00开播、CCTV-5 19:30并机)。4场SF:女单 王曼昱 vs(蒯曼/早田希娜胜者)、王艺迪 vs 张本美和(已定);男单 张本智和 vs(松岛辉空/拉内弗胜者)、达科 vs(F.勒布伦/雨果胜者)。女单/男单决赛按马尔默6h时差落北京时间8/17凌晨,CCTV-5/5+黄金档直播。具体分场时间以央视当日节目单为准。"
    }
]

# ---- 4. 8/17(明日)决赛:保持 pending,细化 schedule ----
d17 = by_date["2026-08-17"]
d17["pending"] = True
d17["matches"] = []
d17["schedule"] = [
    {
        "time": "约00:00起(北京时间·马尔默8/16晚)",
        "channel": "CCTV-5 / CCTV-5+",
        "tournament": "WTT欧洲大满贯瑞典站",
        "content": "收官决战·女单决赛 + 男单决赛(五项目冠军同日决出)。按马尔默当地6小时时差,女单/男单决赛实际落北京时间8/17凌晨,央视CCTV-5与CCTV-5+黄金档直播(确切分场时间以央视当日节目单为准,待8/16半决赛赛果及官方赛程放出后回填)。"
    }
]

# ---- 5. 新增 8/18(后日):赛事已收官,pending 空 ----
d18 = {
    "date": "2026-08-18",
    "weekday": "周二",
    "matches": [],
    "pending": True,
    "schedule": [
        {
            "time": "—",
            "channel": "—",
            "tournament": "WTT欧洲大满贯瑞典站",
            "content": "本站(8/8-16 马尔默)已收官,冠军于8/17凌晨全部产生。下一项国乒重点赛事待 WTT 官方赛程公布后再回填。"
        }
    ]
}
data["days"].append(d18)

# 保证顺序 8/15 → 8/16 → 8/17 → 8/18
order = ["2026-08-15", "2026-08-16", "2026-08-17", "2026-08-18"]
data["days"].sort(key=lambda d: order.index(d["date"]))

# ---- 6. updatedAt + note ----
data["updatedAt"] = "2026-08-16 01:42"
seg = ("【2026-08-16 01:42 主任务全量早报·编排器并行自采(网易/央视/CCTV/直播吧/微博WTT/腾讯/新浪/头条 共7+独立域)】"
       "窗口 08-16 08:00~08-17 08:00(收官日)。采集结论:"
       "①8/15晚间5场全部终局——王曼昱4-1彭郁涵、达科4-2阿萨尔、王艺迪4-0石洵瑶、张本智和4-0A.勒布伦、"
       "张本美和/早田希娜3-1杜凯琹/吴咏琳(女双冠军),经网易/CCTV/新浪/微博WTT多源一致确认。"
       "②8/16凌晨网络端5场——男双决赛勒布伦兄弟3-0黄镇廷/陈颢桦(法国男双夺冠)、陈熠0-4张本美和(国乒女单剩4人进八强:"
       "王曼昱/王艺迪已进四强,蒯曼凌晨战早田,陈熠出局);松岛辉空vs拉内弗(01:45)、蒯曼vs早田希娜(02:30)、"
       "F.勒布伦vs雨果(03:15)截至01:42未开赛,留待刷新链补录。"
       "③8/16 18:00单打半决赛CCTV-5/CCTV-5+直播:女单 王曼昱vs(蒯曼/早田胜者)、王艺迪vs张本美和(已定);"
       "男单 张本智和vs(松岛/拉内弗胜者)、达科vs(F.勒布伦/雨果胜者);女单/男单决赛落8/17凌晨CCTV-5/5+。"
       "④窗口平移:昨日=08-15(5场战报)、今日=08-16、明日=08-17(决赛pending)、后日=08-18(收官空);08-14按「不要两天前」剔除。"
       "updatedAt改01:42。\n")
data["note"] = seg + data.get("note", "")

with open(PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# 校验
with open(PATH, "r", encoding="utf-8") as f:
    json.load(f)
print("OK updatedAt=", data["updatedAt"])
print("days=", [d["date"] for d in data["days"]])
print("8/15 matches=", len(by_date["2026-08-15"]["matches"]), "8/16 matches=", len(by_date["2026-08-16"]["matches"]))
