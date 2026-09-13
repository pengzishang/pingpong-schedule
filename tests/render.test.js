'use strict';
/**
 * 渲染层测试 —— 断言构建函数产出的 HTML 字符串。
 * 不装 jsdom、不测挂载层(挂载依赖真实 DOM,Node 里没意义)。
 */

const test = require('node:test');
const assert = require('node:assert');
const { loadApp, loadJSON } = require('./_harness');
const {
  RECAP_0829, META_0829, NOTE_RANKLABEL_TRAP, NOTE_WITH_ROSTER, NOTE_SEED_NO_NAME, VIDEO_NOTE,
  SCHEDULE_BLOB, RANK_POINT
} = require('./_fixtures');

const api = loadApp();

// ===========================================================================
// 一、renderRecapHtml(录像/典藏回顾三层结构)
// ===========================================================================

test('renderRecapHtml: 产出 headline / result / boards / highlight 四层', () => {
  const h = api.renderRecapHtml(api.parseRecapProgram(RECAP_0829));
  assert.match(h, /class="prog__headline"/);
  assert.match(h, /class="prog__result"/);
  assert.match(h, /class="prog__boards"/);
  assert.match(h, /class="prog__highlight"/);
});

test('renderRecapHtml: 逐盘条数与解析结果一致', () => {
  const p = api.parseRecapProgram(RECAP_0829);
  const h = api.renderRecapHtml(p);
  const count = (h.match(/<li class="prog__board"/g) || []).length;
  assert.strictEqual(count, p.boards.length);
  assert.strictEqual(count, 4);
});

test('renderRecapHtml: ok=false 时返回空串(交由调用方回退原文)', () => {
  assert.strictEqual(api.renderRecapHtml(api.parseRecapProgram('比赛5')), '');
  assert.strictEqual(api.renderRecapHtml(null), '');
});

test('renderRecapHtml: HTML 已转义,原始文本里的尖括号不会注入', () => {
  const p = api.parseRecapProgram(
    'X杯1/8决赛,甲<img src=x onerror=alert(1)>不敌乙,止步16强:第一盘甲0-3乙(8-11/8-11/6-11),' +
    '第二盘甲3-1丙(11-4/11-13/11-8/11-2),第三盘甲2-3乙,第四盘甲2-3乙,决胜局11-13惜败——故事');
  const h = api.renderRecapHtml(p);
  assert.ok(h.indexOf('<img src=x') < 0, '裸 img 标签必须被转义掉');
  assert.match(h, /&lt;img/);
});

// ===========================================================================
// 二、renderEventMetaHtml(赛事信息 key-value)
// ===========================================================================

test('renderEventMetaHtml: 产出 title + facts + points 三段', () => {
  const h = api.renderEventMetaHtml(api.parseEventMeta(META_0829));
  assert.match(h, /class="emeta__title"/);
  assert.match(h, /class="emeta__facts"/);
  assert.match(h, /class="emeta__points"/);
});

test('renderEventMetaHtml: facts 与 points 条数与解析一致,含队要点加 --team', () => {
  const p = api.parseEventMeta(META_0829);
  const h = api.renderEventMetaHtml(p);
  assert.strictEqual((h.match(/<li class="emeta__fact"/g) || []).length, p.facts.length);
  assert.strictEqual((h.match(/<li class="emeta__point/g) || []).length, p.points.length);
  assert.match(h, /emeta__point--team/, '含「队」的要点应升权');
});

test('renderEventMetaHtml: ok=false 返回空串', () => {
  assert.strictEqual(api.renderEventMetaHtml(api.parseEventMeta('')), '');
});

// ===========================================================================
// 三、renderNextCard —— roster 卡片组路径
// ===========================================================================

test('renderNextCard[roster]: 出战男左女右双栏 + 缺席卡 + 结构化 meta', () => {
  const h = api.renderNextCard({ note: NOTE_WITH_ROSTER, date: '2026-09-25', daysAway: 27 });
  assert.match(h, /squad-grid/);
  assert.match(h, /squad-card--male/);
  assert.match(h, /squad-card--female/);
  assert.match(h, /absent-card/);
  assert.match(h, /emeta__title/, 'roster 路径的 meta 也要走结构化');
});

test('renderNextCard[roster]: 头号种子 callout 带国旗 + 人名 + 年龄', () => {
  const h = api.renderNextCard({ note: NOTE_WITH_ROSTER, date: '2026-09-25', daysAway: 27 });
  assert.match(h, /next__callout/);
  assert.ok(h.indexOf('🇯🇵') >= 0, '应显示日本国旗');
  assert.ok(h.indexOf('张本美和') >= 0);
  assert.ok(h.indexOf('17岁') >= 0);
});

test('renderNextCard[roster]: 有姓名时不显示「待官方公布」', () => {
  const h = api.renderNextCard({ note: NOTE_WITH_ROSTER, date: '2026-09-25', daysAway: 27 });
  assert.ok(h.indexOf('待官方公布') < 0);
});

// ===========================================================================
// 四、renderNextCard —— fallback 路径(无 roster)
// ===========================================================================

test('renderNextCard[fallback]: meta 同样走 emeta 结构化(不再是一坨)', () => {
  const h = api.renderNextCard({ note: META_0829, date: '2026-09-08', daysAway: 10 });
  assert.match(h, /emeta__title/);
  assert.match(h, /emeta__facts/);
  assert.match(h, /emeta__points/);
});

test('renderNextCard[fallback]: 无姓名种子 → 显示「待官方公布」+ tbd 弱化样式', () => {
  const h = api.renderNextCard({ note: NOTE_SEED_NO_NAME, date: '2026-09-08', daysAway: 10 });
  assert.ok(h.indexOf('待官方公布') >= 0);
  assert.match(h, /next__callout--tbd/);
});

// 8/29 真实 note 里「世界第1」是王楚钦的 rankLabel,本来就该出现在出战卡里;
// 关键是它**不能混进头号种子 callout** —— 旧实现正是把它整个当成了种子选手名。
test('renderNextCard: 头号种子 callout 只渲染张本美和,不混入 rankLabel 片段', () => {
  const h = api.renderNextCard({ note: NOTE_RANKLABEL_TRAP, date: '2026-09-08', daysAway: 10 });
  const callout = (h.match(/<div class="next__callout">[\s\S]*?<\/div>/) || [''])[0];
  assert.ok(callout, '应产出 callout');
  assert.ok(callout.indexOf('张本美和') >= 0, 'callout 应含真实种子选手');
  assert.ok(callout.indexOf('6289分') >= 0, 'callout 应带积分');
  assert.ok(callout.indexOf('世界第') < 0, 'callout 不得混入 rankLabel 片段');
});

// ===========================================================================
// 五、renderItemListHtml(录像/典藏列表:长回顾与短节目混合)
// ===========================================================================

test('renderItemListHtml: 短节目名单行 prog__text,长回顾走结构化', () => {
  const h = api.renderItemListHtml('pending__section--pp', '🏓 乒乓节目(录像/典藏)', [
    { channel: 'CCTV-16', time: '12:20', program: '奥林匹克典藏-东京奥运会乒乓球女子单打决赛' },
    { channel: 'CCTV-5', time: '16:00', program: '比赛5' },
    { channel: 'CCTV-16', time: '17:00', program: RECAP_0829 }
  ]);
  assert.strictEqual((h.match(/prog__text/g) || []).length, 2, '两条短节目走单行');
  assert.ok(h.indexOf('prog__headline') >= 0, '长回顾走结构化');
  assert.ok(h.indexOf('prog__boards') >= 0);
});

test('renderItemListHtml: 每条都带时间与频道', () => {
  const h = api.renderItemListHtml('s', '标题', [
    { channel: 'CCTV-16', time: '17:00', program: RECAP_0829 }
  ]);
  assert.match(h, /pending__time/);
  assert.match(h, /CCTV-16/);
});

// ===========================================================================
// 六、renderMatchNoteHtml(视频块 chip)
// ===========================================================================

test('renderMatchNoteHtml: chips + lead + hint 都渲染', () => {
  const h = api.renderMatchNoteHtml(api.parseMatchNote(VIDEO_NOTE));
  assert.match(h, /vchip/);
  assert.match(h, /vmatch__lead/);
  assert.match(h, /vmatch__hint/);
});

test('renderMatchNoteHtml: 空解析返回空串(调用方回退原文 esc)', () => {
  assert.strictEqual(api.renderMatchNoteHtml(api.parseMatchNote('')), '');
});

// ===========================================================================
// 七、整页构建(真实 data.json)—— 防 undefined / [object Object] 泄漏
// ===========================================================================

test('buildAbove/buildBelow: 真实 data.json 整页渲染无异常、无脏值', () => {
  const data = loadJSON('data.json');
  if (!data) return;   // 数据文件缺失时跳过,不误报失败

  const ctx = api.prepareCtx(data);
  const all = api.buildAbove(ctx, data) + api.buildBelow(ctx, data);

  assert.ok(all.length > 500, '应产出实质 HTML');
  assert.ok(all.indexOf('>undefined<') < 0, '不得出现 >undefined<');
  assert.ok(!/\sundefined\s/.test(all), '不得出现孤立 undefined');
  assert.ok(all.indexOf('[object Object]') < 0);
  assert.ok(all.indexOf('>NaN<') < 0);
});

test('buildAbove/buildBelow: 产出不含未转义的裸 script(防注入)', () => {
  const data = loadJSON('data.json');
  if (!data) return;
  const ctx = api.prepareCtx(data);
  const all = api.buildAbove(ctx, data) + api.buildBelow(ctx, data);
  assert.ok(all.indexOf('<script') < 0, '渲染产物不应含 script 标签');
});

// 2026-08-31 线上复盘:真实下一站数据不得再出现 695 字赛程大坨 / 126 字排行榜巨行
test('renderNextCard[真实数据]: schedule/tv 拆成 next__lines,排行榜拆成 emeta__rank', () => {
  const data = loadJSON('data.json');
  if (!data || !data.nextEvent) return;
  const h = api.renderNextCard(data.nextEvent);

  assert.ok(h.indexOf('next__lines') >= 0, '赛程/直播描述段应拆成多行列表');
  assert.ok((h.match(/<ul class="next__lines">/g) || []).length >= 1,
    '应至少出现一个 next__lines');
  assert.ok(h.indexOf('emeta__rank') >= 0, '排行榜要点应拆成子列表');
  assert.ok((h.match(/emeta__rank-item/g) || []).length >= 10, '排行榜应 >=10 名各一行');

  assert.strictEqual(h.indexOf(SCHEDULE_BLOB), -1,
    '整段 695 字赛程不得再以单一连续段落出现(已被 ； 拆开)');
  assert.strictEqual(h.indexOf(RANK_POINT), -1,
    '整条 126 字排行榜不得再以单一连续巨行出现(已被拆开)');
});

// 2026-09-01 线上复盘:空窗天叙事体说明(880 字)不得再整坨
test('buildBelow[真实数据]: 空窗天说明拆成 pending__points,容器内最长要点 ≤120 字', () => {
  const data = loadJSON('data.json');
  if (!data) return;
  // 2026-09-08 空窗期结束(澳门站开赛):只有「窗口内可见、且当天无央视直播」的空窗天
  // 才会渲染 dayNote 要点块。若四日窗口内已无此类空窗天(今日/明日/后日都有真实直播),
  // pending__points 自然为 0,本守卫自动休眠;下一个空窗期到来时自动恢复生效。
  const _n = new Date();
  const todayStr = _n.getFullYear() + '-' +
    String(_n.getMonth() + 1).padStart(2, '0') + '-' +
    String(_n.getDate()).padStart(2, '0');
  const hasVisibleEmptyDay = (data.days || []).some(function (x) {
    return x.date >= todayStr && !(x.matches || []).length && x.dayNote;
  });
  if (!hasVisibleEmptyDay) return;
  const ctx = api.prepareCtx(data);
  const all = api.buildAbove(ctx, data) + api.buildBelow(ctx, data);
  const idx = all.indexOf('pending__points');
  assert.ok(idx >= 0, '空窗说明应渲染成 pending__points 要点列表');
  // 取 pending__points 容器段(到其闭合 </div>),逐文本块查最长
  const end = all.indexOf('</div>', idx);
  const seg = all.substring(idx, end + 6);
  const texts = seg.split(/<[^>]+>/).map(s => s.trim()).filter(Boolean);
  const longest = texts.reduce((m, t) => Math.max(m, t.length), 0);
  assert.ok(longest <= 120,
    'pending__points 内最长要点应 ≤120 字(适老化无大坨),实际=' + longest +
    ' :: ' + (texts.sort((a, b) => b.length - a.length)[0] || '').substring(0, 50));
});

// ===========================================================================
// 八、stage 括号说明拆层(2026-09-13)
// 标题 pill 只留「赛事 · 轮次」,括号里的赛制/后续赛程另起一条说明。
// 用线上 9/13 真实 stage 形态构造一天,走整页构建链路断言。
// ===========================================================================

const STAGE_WITH_DETAIL = '女单半决赛(七局四胜,胜者进今晚18:30决赛)';
// 线上 2026-09-13 13:05 真实形态:第一场半决赛已打完
const STAGE_DONE = '女单半决赛(七局四胜),陈熠已晋级今晚18:30决赛';

function stageFixtureData(stage) {
  const data = loadJSON('data.json');
  if (!data) return null;
  const clone = JSON.parse(JSON.stringify(data));
  // 2026-09-14 修复:原写死 2026-09-13,日期推进后该日变成「昨天」,视频兜底块只在
  // 今天/明天/后天分支渲染 → 用例拿不到 vmatch__stage-detail。改为相对 new Date() 动态取今天。
  const t0 = new Date();
  const todayKey = t0.getFullYear() + '-' + String(t0.getMonth() + 1).padStart(2, '0') +
                   '-' + String(t0.getDate()).padStart(2, '0');
  clone.days = [{
    date: todayKey, weekday: '周日',
    matches: [{
      time: '11:00', channel: 'CCTV-5', tournament: 'WTT澳门冠军赛2026',
      stage: stage || STAGE_WITH_DETAIL,
      nationHome: '中国', playerHome: '陈熠',
      playerHomeInfo: '国乒女单,本站8号种子,1/4决赛4-0零封德国43岁削球老将韩莹',
      nationAway: '日本', playerAway: '早田希娜',
      playerAwayInfo: '日本女单,本站4号种子,1/4决赛4-1淘汰队友大藤沙月'
    }],
    schedule: [], pending: []
  }];
  clone.nextEvent = null;
  return clone;
}

test('match 卡: 括号说明不留在标题 pill,另起 .match__stage-detail 条目', () => {
  const data = stageFixtureData();
  if (!data) return;
  const ctx = api.prepareCtx(data);
  const all = api.buildAbove(ctx, data) + api.buildBelow(ctx, data);

  // 标题 pill:赛事 + 轮次,不带括号
  assert.match(all, /class="match__event">🏆 WTT澳门冠军赛2026 · 女单半决赛</);
  assert.strictEqual(all.indexOf('女单半决赛(七局四胜'), -1, '括号说明不得留在标题里');
  // 说明条目紧随其后
  assert.ok(all.indexOf('<div class="match__stage-detail">七局四胜 · 胜者进今晚18:30决赛</div>') >= 0,
    '应产出独立说明条目');
  // 说明条目必须排在标题 pill 之后、时间条之前
  const iEvent = all.indexOf('class="match__event"');
  const iDetail = all.indexOf('class="match__stage-detail"');
  const iBar = all.indexOf('class="match__bar"');
  assert.ok(iEvent > -1 && iDetail > iEvent && iBar > iDetail,
    '顺序应为 标题 → 说明条目 → 时间条');
  // 不得复用 .match__event 的类名(否则两条视觉同级,层次又糊了)
  assert.strictEqual((all.match(/class="match__stage-detail">/g) || []).length, 1);
});

test('match 卡: 已完赛形态(括号在中间 + 逗号后补充)标题同样只留主体', () => {
  const data = stageFixtureData(STAGE_DONE);
  if (!data) return;
  const ctx = api.prepareCtx(data);
  const all = api.buildAbove(ctx, data) + api.buildBelow(ctx, data);

  assert.match(all, /class="match__event">🏆 WTT澳门冠军赛2026 · 女单半决赛</);
  assert.strictEqual(all.indexOf('(七局四胜)'), -1, '括号说明不得留在标题里');
  assert.strictEqual(all.indexOf(',陈熠已晋级'), -1, '逗号后的补充不得留在标题里');
  assert.ok(all.indexOf('<div class="match__stage-detail">七局四胜 · 陈熠已晋级今晚18:30决赛</div>') >= 0,
    '应产出独立说明条目');
});

// 真实数据守卫:标题 pill 一律不得含括号说明(本项目约定 tournament 名称本身不带括号)。
// 窗口里没有带括号的 stage 时本守卫无害通过。
test('buildAbove[真实数据]: 标题 pill 一律不含 stage 括号说明', () => {
  const data = loadJSON('data.json');
  if (!data) return;
  const ctx = api.prepareCtx(data);
  const all = api.buildAbove(ctx, data) + api.buildBelow(ctx, data);
  const events = (all.match(/class="match__event">(.*?)<\/div>/g) || []);
  for (const e of events) {
    assert.ok(e.indexOf('(') < 0 && e.indexOf('（') < 0,
      '标题 pill 不得含括号说明: ' + e);
  }
});

test('match 卡: stage 无括号时不得凭空产出说明条目', () => {
  const data = stageFixtureData();
  if (!data) return;
  data.days[0].matches[0].stage = '女单1/4决赛';
  const ctx = api.prepareCtx(data);
  const all = api.buildAbove(ctx, data) + api.buildBelow(ctx, data);
  assert.match(all, /class="match__event">🏆 WTT澳门冠军赛2026 · 女单1\/4决赛</);
  assert.strictEqual(all.indexOf('match__stage-detail'), -1, '无括号说明时不应产出空条目');
});

test('视频块: 走同一条拆分规则(.vmatch__stage-detail),标题 pill 也不带括号', () => {
  const data = stageFixtureData();
  if (!data) return;
  const m = data.days[0].matches[0];
  const video = {
    time: m.time, platform: '咪咕视频', tournament: m.tournament, stage: m.stage,
    nationHome: m.nationHome, playerHome: m.playerHome, playerHomeInfo: m.playerHomeInfo,
    nationAway: m.nationAway, playerAway: m.playerAway, playerAwayInfo: m.playerAwayInfo
  };
  // 无央视电视直播 → 该日走视频块兜底分支
  data.days[0].matches = [];
  data.days[0].videoMatches = [video];
  const ctx = api.prepareCtx(data);
  const all = api.buildAbove(ctx, data) + api.buildBelow(ctx, data);

  assert.match(all, /class="vmatch__event">🏆 WTT澳门冠军赛2026 · 女单半决赛</);
  assert.strictEqual(all.indexOf('女单半决赛(七局四胜'), -1, '视频块标题同样不得带括号');
  assert.ok(all.indexOf('<div class="vmatch__stage-detail">七局四胜 · 胜者进今晚18:30决赛</div>') >= 0,
    '视频块应产出独立说明条目');
});
