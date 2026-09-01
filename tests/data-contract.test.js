'use strict';
/**
 * 数据契约测试 —— 校验采集端产出的 data.json / video.json 是否守约。
 * 目标:MEMORY 第九节「对侧产出违反铁律的数据,本地跑一遍立即红灯」。
 *
 * 契约主权在采集端(另一台机器整文件重写),前端只读。这里不校验内容的正确性
 * (比分对不对、赛程准不准),只校验**结构**与**铁律**。
 */

const test = require('node:test');
const assert = require('node:assert');
const { loadApp, loadJSON } = require('./_harness');

const api = loadApp();
const data = loadJSON('data.json');
const video = loadJSON('video.json');

/** 数据文件缺失时跳过(不误报失败),但要在输出里说清楚 */
const hasData = !!data;
const skipNote = hasData ? '' : ' (data.json 缺失,跳过)';

// ===========================================================================
// 一、data.json 顶层结构
// ===========================================================================

test('data.json: 顶层字段齐全' + skipNote, (t) => {
  if (!hasData) return t.skip('data.json 缺失');
  assert.ok(data.updatedAt, '必须有 updatedAt');
  assert.ok(Array.isArray(data.days) && data.days.length, 'days 必须是非空数组');
});

test('data.json: days 天数在 1~5 天窗口内,且日期递增' + skipNote, (t) => {
  if (!hasData) return t.skip('data.json 缺失');
  const dates = data.days.map(d => d.date);
  assert.ok(dates.length >= 1 && dates.length <= 5, '实际 ' + dates.length + ' 天,超出预期窗口');
  const sorted = dates.slice().sort();
  assert.deepStrictEqual(dates, sorted, 'days 必须按日期升序:' + dates.join(' | '));
});

test('data.json: 每个 day 都有合法 date(YYYY-MM-DD)' + skipNote, (t) => {
  if (!hasData) return t.skip('data.json 缺失');
  data.days.forEach(d => {
    assert.match(d.date, /^\d{4}-\d{2}-\d{2}$/, '非法日期格式:' + d.date);
  });
});

test('data.json: dayNote(若有)必须是字符串,空窗说明契约守约' + skipNote, (t) => {
  if (!hasData) return t.skip('data.json 缺失');
  data.days.forEach(d => {
    if (d.dayNote !== undefined) {
      assert.strictEqual(typeof d.dayNote, 'string', 'dayNote 必须是字符串:' + d.date);
    }
  });
});

// ===========================================================================
// 二、电视铁律:能上电视卡的必须是央视
// ===========================================================================

test('铁律:所有 isTVMatch 判真的比赛,channel 必须是 CCTV/央视' + skipNote, (t) => {
  if (!hasData) return t.skip('data.json 缺失');
  const bad = [];
  data.days.forEach(d => {
    (d.matches || []).forEach(m => {
      if (api.isTVMatch(m) && !api.isCCTVChannel(m.channel)) {
        bad.push(d.date + ' ' + m.time + ' → ' + m.channel);
      }
    });
  });
  assert.deepStrictEqual(bad, [], '以下场次判为电视可看却不是央视频道:\n' + bad.join('\n'));
});

test('铁律:match 的 channel 不得是 app / 网络平台名' + skipNote, (t) => {
  if (!hasData) return t.skip('data.json 缺失');
  const FORBIDDEN = /咪咕|央视频|腾讯体育|优酷|爱奇艺|客户端|网端/;
  const bad = [];
  data.days.forEach(d => {
    (d.matches || []).forEach(m => {
      if (m.channel && FORBIDDEN.test(m.channel)) bad.push(d.date + ' ' + m.channel);
    });
  });
  assert.deepStrictEqual(bad, [], '央视场次表混入了网络平台:\n' + bad.join('\n'));
});

test('dayHasContent: 有央视比赛 / schedule / videoMatches 之一即算有内容', () => {
  // 纯函数自洽性:空 day 必须判为无内容
  assert.strictEqual(api.dayHasContent({}), false);
  assert.strictEqual(api.dayHasContent({ matches: [{ channel: 'CCTV-5', time: '19:30' }] }), true);
  assert.strictEqual(api.dayHasContent({ schedule: [{ content: '空窗说明' }] }), true);
});

// ===========================================================================
// 三、video.json 契约(兜底视频平台)
// ===========================================================================

test('video.json: 存在即可解析,顶层是 days 数组', (t) => {
  if (!video) return t.skip('video.json 缺失(允许,前端兜底不致命)');
  assert.ok(Array.isArray(video.days), 'video.json 顶层必须是 days 数组');
});

test('video.json 铁律:场次用 platform 字段,不得用 channel' + skipNote, (t) => {
  if (!video || !hasData) return t.skip('数据缺失');
  const bad = [];
  (video.days || []).forEach(d => {
    (d.matches || []).forEach(m => {
      if (!m.platform) bad.push(d.date + ' ' + (m.time || '') + ' 缺 platform');
      if ('channel' in m) bad.push(d.date + ' 误用 channel 字段(应为 platform)');
    });
  });
  assert.deepStrictEqual(bad, [], 'video.json 字段契约违规:\n' + bad.join('\n'));
});

test('video.json 铁律:只在当天无央视电视直播的日子兜底' + skipNote, (t) => {
  if (!video || !hasData) return t.skip('数据缺失');
  const bad = [];
  (video.days || []).forEach(vd => {
    const day = (data.days || []).find(d => d.date === vd.date);
    const tvCount = day ? (day.matches || []).filter(api.isTVMatch).length : 0;
    if (tvCount > 0) {
      bad.push(vd.date + ' 当天已有 ' + tvCount + ' 场央视电视,不该再给视频兜底');
    }
  });
  assert.deepStrictEqual(bad, [], '视频兜底与央视电视冲突:\n' + bad.join('\n'));
});

test('mergeVideo: 原地合并 videoMatches 到对应 day,不影响原央视数据', () => {
  // 注意:mergeVideo 是**原地修改**第一个参数、不返回值(实测行为,改实现时需同步改这里)
  const base = {
    days: [{ date: '2026-09-01', matches: [{ channel: 'CCTV-5', time: '19:30' }] }]
  };
  const vd = {
    days: [{
      date: '2026-09-01',
      matches: [{ time: '20:00', platform: '咪咕视频', playerHome: '甲', playerAway: '乙' }]
    }]
  };
  const ret = api.mergeVideo(base, vd);
  assert.strictEqual(ret, undefined, 'mergeVideo 不返回值,靠原地修改');

  const day = base.days.find(d => d.date === '2026-09-01');
  assert.ok(day.videoMatches && day.videoMatches.length === 1, '应挂上 videoMatches');
  assert.strictEqual(day.videoMatches[0].platform, '咪咕视频');
  assert.strictEqual(day.matches.length, 1, '原央视比赛不应被覆盖');
});

test('mergeVideo: data.json 没有该日期时自动补建空 day', () => {
  const base = { days: [{ date: '2026-09-01', matches: [] }] };
  const vd = { days: [{ date: '2026-09-05', matches: [{ time: '20:00', platform: '央视频' }] }] };
  api.mergeVideo(base, vd);
  const added = base.days.find(d => d.date === '2026-09-05');
  assert.ok(added, '应补建 2026-09-05 这一天');
  assert.strictEqual(added.videoMatches[0].platform, '央视频');
  assert.ok(added.weekday, '补建时应顺带算出 weekday');
});

test('mergeVideo: 参数不合法时安全 no-op,不抛异常', () => {
  assert.doesNotThrow(() => api.mergeVideo(null, null));
  assert.doesNotThrow(() => api.mergeVideo({ days: [] }, { days: [] }));
  assert.doesNotThrow(() => api.mergeVideo({ days: [] }, {}));
});

// ===========================================================================
// 四、nextEvent 结构
// ===========================================================================

test('nextEvent: 有 date 与 note(渲染「下一站」卡用)' + skipNote, (t) => {
  if (!hasData) return t.skip('data.json 缺失');
  if (!data.nextEvent) return t.skip('当前无 nextEvent(允许)');
  assert.ok(data.nextEvent.date, 'nextEvent 必须有 date');
  assert.match(data.nextEvent.date, /^\d{4}-\d{2}-\d{2}$/);
});

test('nextEvent: note 若存在,解析后不得抛异常' + skipNote, (t) => {
  if (!hasData || !data.nextEvent || !data.nextEvent.note) return t.skip('无 note');
  const p = api.parseNextEventNote(data.nextEvent.note);
  assert.ok(p && typeof p === 'object');
  // 头号种子若有值,不得是纯分类词(那是 rankLabel 误判的特征)
  if (p.headSeed && p.headSeed.name) {
    assert.ok(
      !/^(世界第|冠军|种子|女单|男单)$/.test(p.headSeed.name),
      'headSeed 抽到了分类词而非人名:' + p.headSeed.name
    );
  }
});
