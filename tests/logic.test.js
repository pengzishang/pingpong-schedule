'use strict';
/**
 * 解析器单测 —— 对着历史 bug 写,每条都对应一次真实踩坑。
 * 跑了:node --test tests/logic.test.js
 */

const test = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./_harness');

const api = loadApp();

// ---------------------------------------------------------------------------
// 共享样本(全部来自真实 data.json 或子上截图)见 tests/_fixtures.js
// ---------------------------------------------------------------------------
const {
  RECAP_0829, META_0829, NOTE_RANKLABEL_TRAP, NOTE_WITH_ROSTER, VIDEO_NOTE
} = require('./_fixtures');

// ===========================================================================
// 一、括号工具(splitOutsideParens / matchOutsideParens)
// ===========================================================================

test('splitOutsideParens: 括号内的 / 不被切开(保护选手名单)', () => {
  const parts = api.splitOutsideParens('王楚钦(卫冕冠军/世界第1),林诗栋', ',，');
  assert.strictEqual(parts.length, 2);
  assert.strictEqual(parts[0], '王楚钦(卫冕冠军/世界第1)');
  assert.strictEqual(parts[1], '林诗栋');
});

test('splitOutsideParens: 分号也能切(处理「梁靖崑(...);韩国队全员...」连写)', () => {
  const parts = api.splitOutsideParens('梁靖崑(轮休备战亚运);韩国队全员缺席', '、,，;；');
  assert.strictEqual(parts.length, 2);
});

test('splitOutsideParens: 中英文括号都算深度', () => {
  assert.strictEqual(api.splitOutsideParens('甲（乙,丙）,丁', ',，').length, 2);
  assert.strictEqual(api.splitOutsideParens('甲(乙,丙),丁', ',，').length, 2);
});

test('matchOutsideParens: 跳过括号内的匹配,只返回深度 0 的那一个', () => {
  const s = '王楚钦(头号种子·卫冕冠军)。外协:女单头号种子为日本张本美和(6289分)';
  const m = api.matchOutsideParens(s, /(头号种子)/);
  assert.ok(m, '应找到括号外的匹配');
  assert.strictEqual(m.index, s.indexOf('头号种子为日本'), '命中的应是括号外那个');
});

test('matchOutsideParens: 全部匹配都在括号内时返回 null', () => {
  const m = api.matchOutsideParens('王楚钦(头号种子·卫冕冠军)、林诗栋(8号种子)', /(头号种子)/);
  assert.strictEqual(m, null);
});

// ===========================================================================
// 二、parseRecapProgram(录像/典藏节目长文本拆层, 2026-08-29)
// ===========================================================================

test('parseRecapProgram: 长回顾拆出 headline / result / boards / decider / highlight', () => {
  const r = api.parseRecapProgram(RECAP_0829);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.headline, '德国杯1/8决赛');
  assert.match(r.result, /1-3不敌卫冕冠军奥克森豪森/);
  assert.strictEqual(r.boards.length, 4);
  assert.match(r.decider, /决胜局/);
  assert.match(r.highlight, /户上隼辅职业生涯第一次赢樊振东/);
});

test('parseRecapProgram: result 已剥掉尾部赛制注记括号', () => {
  const r = api.parseRecapProgram(RECAP_0829);
  assert.ok(!/单场淘汰/.test(r.result), '不应残留「(单场淘汰,输一场就回家)」');
});

test('parseRecapProgram: 逐盘 order/players/sets 正确(含两端盘次)', () => {
  const r = api.parseRecapProgram(RECAP_0829);
  assert.strictEqual(r.boards[0].order, '第一盘');
  assert.match(r.boards[0].players, /卡尔伯格/);
  assert.match(r.boards[0].players, /户上隼辅/);
  assert.strictEqual(r.boards[0].sets, '8-11/8-11/6-11');
  assert.strictEqual(r.boards[3].sets, '4-11/8-11/11-8/11-9/11-13');
});

test('parseRecapProgram: 短节目名不拆(ok=false,调用方回退原文)', () => {
  assert.strictEqual(api.parseRecapProgram('奥林匹克典藏-东京奥运会乒乓球女子单打决赛').ok, false);
  assert.strictEqual(api.parseRecapProgram('比赛5').ok, false);
});

test('parseRecapProgram: 长但无「第X盘」结构也不拆', () => {
  const long = '这是一段很长很长很长的描述文字，但是里面完全没有逐盘比分的任何结构信息，所以不应该被拆开处理成结构化数据';
  assert.strictEqual(api.parseRecapProgram(long).ok, false);
});

test('parseRecapProgram: 空输入安全返回', () => {
  assert.strictEqual(api.parseRecapProgram('').ok, false);
  assert.strictEqual(api.parseRecapProgram(null).ok, false);
  assert.strictEqual(api.parseRecapProgram(undefined).ok, false);
});

// ===========================================================================
// 三、parseEventMeta(下一站赛事信息拆 key-value, 2026-08-29)
// ===========================================================================

test('parseEventMeta: title 取第一个左括号之前', () => {
  const m = api.parseEventMeta(META_0829);
  assert.strictEqual(m.ok, true);
  assert.strictEqual(m.title, 'WTT澳门冠军赛2026');
});

test('parseEventMeta: 括号内拆出 4 条 facts 并按语义配图标', () => {
  const m = api.parseEventMeta(META_0829);
  assert.strictEqual(m.facts.length, 4);
  assert.strictEqual(m.facts[0].icon, '📍');
  assert.match(m.facts[0].value, /东亚运动会体育馆/);
  assert.strictEqual(m.facts[1].icon, '📅');
  assert.strictEqual(m.facts[1].value, '9/8-9/13');
  assert.strictEqual(m.facts[2].icon, '💰');
  assert.match(m.facts[2].value, /美元/);
  assert.strictEqual(m.facts[3].icon, '🎯');
  assert.match(m.facts[3].value, /32人正赛/);
});

test('parseEventMeta: points 按逗号也拆,日/韩各自独立成条', () => {
  const m = api.parseEventMeta(META_0829);
  assert.strictEqual(m.points.length, 4);
  assert.match(m.points[0], /^日本队全主力/);
  assert.match(m.points[0], /张本智和\/松岛辉空\/张本美和\/早田希娜/, '括号内选手名单的 / 不能被劈开');
  assert.strictEqual(m.points[1], '韩国队全员弃赛');
  assert.match(m.points[2], /男双\/女双/);
  assert.match(m.points[3], /混双选拔赛/);
});

test('parseEventMeta: 空输入 ok=false', () => {
  assert.strictEqual(api.parseEventMeta('').ok, false);
});

// ===========================================================================
// 四、headSeed(头号种子)—— 2026-08-29 子上反馈「头号种子又看不到了」的重灾区
// ===========================================================================

test('headSeed: 经典句式「女单头号种子为日本张本美和(18岁)」', () => {
  const p = api.parseNextEventNote('WTT赛(澳门,9/8)。女单头号种子为日本张本美和(18岁)。CCTV-5直播(3源确认)');
  assert.strictEqual(p.headSeed.name, '日本张本美和');
  assert.strictEqual(p.headSeed.age, '18岁');
});

test('headSeed: 积分括号 (6289分) 归 rank 而非 age', () => {
  const p = api.parseNextEventNote('WTT赛(澳门,9/8)。女单头号种子为日本张本美和(6289分)。CCTV-5直播(3源确认)');
  assert.strictEqual(p.headSeed.name, '日本张本美和');
  assert.strictEqual(p.headSeed.rank, '6289分');
  assert.strictEqual(p.headSeed.age, '');
});

test('headSeed: 跳过括号内 rankLabel,命中括号外真种子句 ← 8/29 真实踩坑', () => {
  const p = api.parseNextEventNote(NOTE_RANKLABEL_TRAP);
  assert.strictEqual(p.headSeed.name, '日本张本美和',
    '不得把「王楚钦(头号种子·卫冕冠军·世界第1)」里的标签当种子句');
  assert.strictEqual(p.headSeed.rank, '6289分');
});

test('headSeed: 括号外无种子句时返回 null(宁缺勿猜,不把 rankLabel 当种子)', () => {
  const p = api.parseNextEventNote('WTT赛(北京,9/8)。国乒男单:王楚钦(头号种子·卫冕冠军·世界第1)、林诗栋(8号种子)。直播渠道:CCTV-5(3源确认)');
  assert.strictEqual(p.headSeed, null);
});

test('headSeed: 只有分类词无真实姓名 → name 为空(渲染成「待官方公布」)', () => {
  const p = api.parseNextEventNote('WTT赛(澳门,9/8)。卫冕冠军·女单1号种子。日本队全主力压境(3源确认)');
  assert.strictEqual(p.headSeed.name, '',
    '不得把「卫冕冠军/女单/号种子」这类分类词当人名');
});

test('headSeed: 卫冕冠军后紧跟人名能抽到', () => {
  assert.strictEqual(
    api.parseNextEventNote('WTT赛(澳门,9/8)。卫冕冠军孙颖莎。日本队压境(3源确认)').headSeed.name, '孙颖莎');
  assert.strictEqual(
    api.parseNextEventNote('WTT赛(澳门,9/8)。卫冕女单陈梦。日本队压境(3源确认)').headSeed.name, '陈梦');
});

test('headSeed: 无括号也不贪婪截断(「为日本张本美和」不切成「为日本张」)', () => {
  const p = api.parseNextEventNote('WTT赛(澳门,9/8)。女单头号种子为日本张本美和。CCTV-5直播(3源确认)');
  assert.strictEqual(p.headSeed.name, '日本张本美和');
});

test('headSeed: 空格分隔的裸姓名也能抽到', () => {
  const p = api.parseNextEventNote('WTT赛(北京,9/8)。男单头号种子 王楚钦。CCTV-5直播(3源确认)');
  assert.strictEqual(p.headSeed.name, '王楚钦');
});

test('headSeed: 完全没有种子词时为 null(不渲染 callout)', () => {
  const p = api.parseNextEventNote('WTT赛(澳门,9/8)。日本队全主力压境,韩国队全员弃赛(3源确认)');
  assert.strictEqual(p.headSeed, null);
});

// ===========================================================================
// 五、parseNextRoster(出战/缺席名单)—— 2026-08-28 发现的潜伏 bug 回归
// ===========================================================================

// 注意:parseNextRoster 用 lookahead 关键字(缺席/退赛/直播渠道/赛程/赛后/最近战报/
// 头号种子/亚运名单/背景)来截断名单段。样本必须带这些关键字之一,否则会一路吞到结尾。
test('parseNextRoster: 认「国乒N人:」前缀(旧版只认「出战:」导致 squad 长期为空)', () => {
  const r = api.parseNextRoster(
    'WTT中国大满贯(北京)。国乒5人:男单王楚钦(世界第1)、樊振东、马龙,女单孙颖莎(卫冕冠军)、陈梦。' +
    '缺席:梁靖崑(轮休备战亚运)。直播渠道:CCTV-5(4源确认)');
  assert.strictEqual(r.squad.length, 5, '应拆出 5 人');
  assert.ok(r.squad.some(s => s.name === '王楚钦'), '应含王楚钦');
  assert.ok(r.squad.some(s => s.gender === '男'), '应标记男');
  assert.ok(r.squad.some(s => s.gender === '女'), '应标记女');
});

test('parseNextRoster: rankLabel 保留在括号内原文,不当数字解读', () => {
  const r = api.parseNextRoster('WTT赛(北京)。国乒2人:男单王楚钦(卫冕冠军/世界第1)、樊振东。CCTV-5(3源)');
  const wc = r.squad.find(s => s.name === '王楚钦');
  assert.ok(wc, '应含王楚钦');
  assert.strictEqual(wc.rankLabel, '卫冕冠军/世界第1', '括号内的 / 不能被劈开');
});

test('parseNextRoster: 缺席段分号连写也能拆开', () => {
  const r = api.parseNextRoster(
    'WTT赛(北京)。国乒1人:男单王楚钦。缺席:梁靖崑(轮休备战亚运);韩国队全员缺席(集中备战亚运)。CCTV-5(3源)');
  assert.ok(r.absent.length >= 2, '缺席应拆出多条');
  assert.ok(r.absent.some(a => a.name === '梁靖崑'));
});

test('parseNextRoster: 备选前缀 出战/报名/参赛/阵容 都认', () => {
  ['出战', '报名', '参赛', '阵容'].forEach(prefix => {
    const r = api.parseNextRoster('WTT赛(北京)。' + prefix + ':男单王楚钦。直播渠道:CCTV-5(3源确认)');
    assert.ok(r.squad.some(s => s.name === '王楚钦'), prefix + ' 前缀应被识别');
  });
});

// 已知限制(记录在案,便于将来改造时评估影响):名单段后若没有任何 lookahead 关键字,
// 会把后续文字一并吞进名单。真实数据都带「直播渠道/赛程/赛后」等,暂时不构成问题。
test('parseNextRoster: [已知限制] 缺少截断关键字时会吞掉后续文字', () => {
  const r = api.parseNextRoster('WTT赛(北京)。出战:男单王楚钦。CCTV-5(3源)');
  assert.ok(
    r.squad.length === 1 && r.squad[0].name.indexOf('王楚钦') === 0,
    '当前实现会把「。CCTV-5(3源)」一起吞进名字里'
  );
});

// ===========================================================================
// 六、parseMatchNote(视频块 note)—— 2026-08-28
// ===========================================================================

test('parseMatchNote: lead 取到首个出战/在阵句', () => {
  const p = api.parseMatchNote('中国选手王楚钦代表山东魏桥出战,日本选手张本智和代表琉球在阵。5盘3胜。');
  assert.match(p.lead, /王楚钦/);
});

test('parseMatchNote: 5盘3胜 → 红色 T5 chip', () => {
  const p = api.parseMatchNote('两人出战。5盘3胜,未必直接对位。');
  assert.ok(p.chips.some(c => c.key === 'T5' && c.tone === 'red'));
});

test('parseMatchNote: 影院 + 票价 → 琥珀 CINEMA chip', () => {
  const p = api.parseMatchNote('出战。影院同步直播,票价80-120元。');
  assert.ok(p.chips.some(c => c.key === 'CINEMA' && c.tone === 'amber'));
});

test('parseMatchNote: 平台提示(手机/平板/电脑)单独抽出', () => {
  const p = api.parseMatchNote('出战。手机/平板/电脑打开咪咕视频。');
  assert.match(p.platformHint, /咪咕/);
});

test('parseMatchNote: 空输入返回空结构(调用方回退原文)', () => {
  const p = api.parseMatchNote('');
  assert.strictEqual(p.lead, '');
  assert.strictEqual(p.chips.length, 0);
});

// ===========================================================================
// 七、铁律判定函数(电视 / 国乒 / 重播)
// ===========================================================================

test('isCCTVChannel: 只认 CCTV / 央视,排除 app 与网络平台', () => {
  ['CCTV-5', 'CCTV-5+', 'CCTV-16', '央视5', '央视5+'].forEach(c =>
    assert.strictEqual(api.isCCTVChannel(c), true, c + ' 应判为央视电视'));
  ['咪咕视频', '央视频', '腾讯体育', '优酷体育', '客户端', 'app', '网页', '网端'].forEach(c =>
    assert.strictEqual(api.isCCTVChannel(c), false, c + ' 不应判为央视电视'));
});

test('riskSaysNoTV: 风险卡含「看APP/咪咕/不直播」→ 电视不可看', () => {
  assert.strictEqual(api.riskSaysNoTV('需用手机看APP'), true);
  assert.strictEqual(api.riskSaysNoTV('咪咕视频独家'), true);
  assert.strictEqual(api.riskSaysNoTV(''), false);
});

test('isTVMatch: CCTV 频道 + 无否定风险 才算电视可看', () => {
  assert.strictEqual(api.isTVMatch({ channel: 'CCTV-5', risk: '' }), true);
  assert.strictEqual(api.isTVMatch({ channel: 'CCTV-5', risk: '需用手机看APP' }), false);
  assert.strictEqual(api.isTVMatch({ channel: '咪咕视频', risk: '' }), false);
});

test('belongsToCN: 含中国/中国澳门,不含中国香港与中国台北', () => {
  assert.strictEqual(api.belongsToCN('中国'), true);
  assert.strictEqual(api.belongsToCN('中国澳门'), true);
  assert.strictEqual(api.belongsToCN('中国香港'), false);
  assert.strictEqual(api.belongsToCN('中国台北'), false);
  assert.strictEqual(api.belongsToCN('日本'), false);
});

test('isTVReplay: 重播与直播解耦 —— 直播上 app、白天重播上央视仍算可看', () => {
  assert.strictEqual(api.isTVReplay({ replay: { channel: 'CCTV-5', time: '09:00' } }), true);
  assert.strictEqual(api.isTVReplay({ replay: { channel: '咪咕视频', time: '09:00' } }), false);
  assert.strictEqual(api.isTVReplay({}), false);
});

test('replayTargetDate: 深夜 23:00 后归次日,凌晨归当日', () => {
  const day = { date: '2026-08-29' };
  assert.strictEqual(api.replayTargetDate(day, { time: '23:30' }), '2026-08-30');
  assert.strictEqual(api.replayTargetDate(day, { time: '02:00' }), '2026-08-29');
});

test('FLAGS: 港澳台键排在「中国」之前(否则被短路)', () => {
  const keys = Object.keys(api.FLAGS);
  assert.ok(keys.indexOf('中国香港') < keys.indexOf('中国'), '中国香港 必须在 中国 之前');
  assert.ok(keys.indexOf('中国澳门') < keys.indexOf('中国'), '中国澳门 必须在 中国 之前');
  assert.ok(keys.indexOf('中国台北') < keys.indexOf('中国'), '中国台北 必须在 中国 之前');
});

test('esc: HTML 转义,防注入', () => {
  assert.strictEqual(api.esc('<b>&"'), '&lt;b&gt;&amp;&quot;');
});
