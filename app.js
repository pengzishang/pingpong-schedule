    // 适老化:纯文本渲染,无动画、无复杂交互,保证任何设备可读

    // ---- 实时时钟(本地时间,每秒跳动) ----
    function tick() {
      var now = new Date();
      var hh = String(now.getHours()).padStart(2, '0');
      var mm = String(now.getMinutes()).padStart(2, '0');
      var ss = String(now.getSeconds()).padStart(2, '0');
      var el = document.getElementById('clock');
      if (el) el.textContent = hh + ':' + mm + ':' + ss;
      var de = document.getElementById('clockDate');
      if (de) de.textContent = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日 ' +
        '星期' + '日一二三四五六'.charAt(now.getDay());
    }
    tick();
    setInterval(tick, 1000);

    // ---- 国旗映射(国籍 → 国旗 emoji) ----
    // ⚠️ 地区键(中国香港/中国澳门/中国台北)必须排在「中国」之前,否则 flagFor 遍历会被「中国」短路
    var FLAGS = {
      '中国香港': '🇭🇰', '香港': '🇭🇰', '中国澳门': '🇲🇴', '澳门': '🇲🇴',
      '中国台北': '🇨🇳', '中华台北': '🇨🇳', '中国': '🇨🇳',
      '日本': '🇯🇵', '韩国': '🇰🇷', '朝鲜': '🇰🇵',
      '法国': '🇫🇷', '德国': '🇩🇪', '英国': '🇬🇧', '瑞典': '🇸🇪',
      '俄罗斯': '🇷🇺', '葡萄牙': '🇵🇹', '丹麦': '🇩🇰',
      '乌克兰': '🇺🇦', '斯洛文尼亚': '🇸🇮', '奥地利': '🇦🇹', '西班牙': '🇪🇸',
      '斯洛伐克': '🇸🇰', '匈牙利': '🇭🇺', '克罗地亚': '🇭🇷', '意大利': '🇮🇹',
      '荷兰': '🇳🇱', '比利时': '🇧🇪', '卢森堡': '🇱🇺', '捷克': '🇨🇿',
      '白俄罗斯': '🇧🇾', '瑞士': '🇨🇭', '希腊': '🇬🇷', '波兰': '🇵🇱',
      '罗马尼亚': '🇷🇴', '塞尔维亚': '🇷🇸', '土耳其': '🇹🇷',
      '美国': '🇺🇸', '加拿大': '🇨🇦', '巴西': '🇧🇷', '波多黎各': '🇵🇷',
      '印度': '🇮🇳', '新加坡': '🇸🇬', '泰国': '🇹🇭', '伊朗': '🇮🇷',
      '澳大利亚': '🇦🇺', '埃及': '🇪🇬', '尼日利亚': '🇳🇬',
      '哈萨克': '🇰🇿', '哈萨克斯坦': '🇰🇿'
    };
    function flagFor(nation) {
      if (!nation) return '';
      for (var key in FLAGS) {
        if (nation.indexOf(key) !== -1) return FLAGS[key];
      }
      return '';
    }
    // 跨国组合兜底:某些场次的 info 只写「跨国组合」,未拆分两国,需根据已知配对补旗
    var CROSS_PAIR_FLAGS = {
      '库库洛娃/达斯': ['斯洛伐克', '印度']
    };
    function crossFlagsForPair(name) {
      var key = (name || '').replace(/\s+/g, '');
      var nations = CROSS_PAIR_FLAGS[key];
      return Array.isArray(nations) ? nations : [];
    }
    // 取某一方旗帜:单打=国籍;双打可能跨国(info 形如「日本/波多黎各」或「中国 · 女双组合」)
    // 优先从 info 拆出多国(跨国双打两人各一面旗),info 无国别且 nation 为「跨国组合」时,
    // 再按已知跨国配对兜底;最后回退到 nation;去重避免重复
    function flagsForSide(name, info, nation) {
      var parts = [];
      function pushFlag(s) { var f = flagFor(s); if (f && parts.indexOf(f) === -1) parts.push(f); }
      if (info) info.split(/[\/／·・,，]/).forEach(function (seg) { pushFlag(seg.trim()); });
      if (!parts.length && nation && nation.indexOf('跨国') !== -1) {
        crossFlagsForPair(name).forEach(pushFlag);
      }
      if (!parts.length && nation) pushFlag(nation);
      return parts.join(' ');
    }

    // 加时间戳 + no-store,绕开 GitHub Pages 的 max-age=600 缓存,保证每次打开都拿最新数据
    // 主数据 data.json 由另一台机器整文件重写;视频平台(咪咕/央视频)直播单独存 video.json,
    // 同样由另一台机器额外写入,本机不抓。两者解耦:video.json 缺失/损坏只让视频块不显示,不致命。
    // ★ 优化:data.json 与 video.json 并行请求(Promise.all),省去一次串行 RTT;video 失败不致命。
    function fetchJSON(url) {
      return fetch(url, { cache: 'no-store' })
        .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); });
    }
    function loadData() {
      var url = 'data.json?t=' + Date.now();
      var vUrl = 'video.json?t=' + Date.now();
      return Promise.all([
        fetchJSON(url),
        fetchJSON(vUrl).catch(function () { return null; })   // 视频缺失/损坏:忽略,只影响视频块
      ]).then(function (arr) {
        var data = arr[0];
        if (!data) throw new Error('数据加载失败');
        if (arr[1]) mergeVideo(data, arr[1]);
        return data;
      });
    }

    // ---- 加载状态机:LOADING(骨架) → PARTIAL(首屏已出) → DONE / ERROR ----
    // localStorage 缓存快照:加载成功后存 {ts,data}(含已合并的视频块),复访≤24h 直接瞬显再后台刷新。
    var CACHE_KEY = 'pp_cache_v1';
    var CACHE_MAX_AGE = 24 * 3600 * 1000;
    function readCache() {
      try {
        var raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        var obj = JSON.parse(raw);
        if (!obj || !obj.data || !obj.ts) return null;
        if (Date.now() - obj.ts > CACHE_MAX_AGE) return null;   // 过旧不瞬显,避免显示昨天赛程
        return obj.data;
      } catch (e) { return null; }
    }
    function writeCache(data) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
    }
    function clearCache() {
      try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
    }
    function showError(err) {
      var days = document.getElementById('days');
      if (!days) return;
      days.innerHTML = '<div class="error">' +
        '数据加载失败(' + esc(err && err.message ? err.message : '未知错误') + ')<br>' +
        '请稍后刷新,或稍后再来访问。' +
        '<button type="button" class="error__retry" id="retryBtn">点此重试</button>' +
        '</div>';
      var btn = document.getElementById('retryBtn');
      if (btn) btn.addEventListener('click', function () { boot(); });
    }
    var _slowTimer = null;
    function armSlowTimer() {
      clearTimeout(_slowTimer);
      _slowTimer = setTimeout(function () {
        var d = document.getElementById('days');
        if (d && d.querySelector('.skeleton')) d.classList.add('is-slow');  // 仍显示骨架→提示加载较慢
      }, 10000);
    }
    function disarmSlowTimer() { clearTimeout(_slowTimer); _slowTimer = null; }

    // 启动:先尝试缓存快照瞬显(同步可用,不画骨架),随后后台静默刷新覆盖;无快照则显示骨架等网络。
    function boot() {
      var cached = readCache();
      if (cached) {
        renderFull(cached, { fromCache: true });   // 复访秒开:直接出上次内容,标「本地缓存」
      } else {
        // 无缓存:保留 index.html 中的静态骨架(LOADING 态),等待网络
      }
      armSlowTimer();
      loadData()
        .then(function (data) {
          disarmSlowTimer();
          writeCache(data);
          if (cached) {
            renderFull(data, { fromCache: false });  // 后台刷新覆盖,去掉缓存标注
          } else {
            renderStaged(data);                       // 首屏先出,下方滚动懒挂载
          }
        })
        .catch(function (err) {
          disarmSlowTimer();
          if (cached) {
            var u = document.getElementById('updatedAt');
            if (u) u.textContent = u.textContent + '（最新刷新失败，显示本地缓存）';
          } else {
            clearCache();
            showError(err);
          }
        });
    }
    // 把 video.json 的直播按 date 合并进 data.days:
    //  - 已存在的 day 直接挂 videoMatches;
    //  - data.json 没有但视频有的日期,补建一个空 day(让空窗但视频有比赛的日子也能显示)。
    function mergeVideo(data, vdata) {
      if (!data || !data.days || !vdata || !Array.isArray(vdata.days)) return;
      var byDate = {};
      data.days.forEach(function (d) { byDate[d.date] = d; });
      var WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      vdata.days.forEach(function (v) {
        if (!v || !v.date) return;
        var matches = Array.isArray(v.matches) ? v.matches : [];
        if (!matches.length) return;
        if (byDate[v.date]) {
          byDate[v.date].videoMatches = matches;
        } else {
          var dt = new Date(v.date + 'T00:00:00');
          data.days.push({
            date: v.date,
            weekday: WD[dt.getDay()],
            matches: [],
            pending: true,
            schedule: [],
            videoMatches: matches
          });
          byDate[v.date] = data.days[data.days.length - 1];
        }
      });
    }
    boot();   // 启动加载(含缓存瞬显 + 渐进式渲染 + 状态机)
    // 赛中比分每 60s 轮询一次,直播中的比赛分数自动更新(配合刷新链写入的 live 字段)
    setInterval(function () {
      loadData().then(function (d) { renderFull(d, { fromPoll: true }); writeCache(d); }).catch(function () {});
    }, 60000);

    // ---- 直播中自动判定:根据当前时间,标记正在进行的比赛 ----
    function parseDt(dateStr, timeStr) {
      if (!dateStr || !timeStr) return null;
      var d = new Date(dateStr + 'T' + timeStr + ':00');
      return isNaN(d.getTime()) ? null : d;
    }
    function isLiveMatch(day, m, now) {
      if (!m || m.result) return false;
      var startDt = parseDt(day.date, m.time);
      if (!startDt) return false;
      var endDt = new Date(startDt.getTime() + 2.5 * 3600 * 1000); // 单场上限约 2.5h
      return now >= startDt && now < endDt;
    }
    // 转播时段卡(如 "10:30-12:00")的直播中判定
    function isLiveSchedule(dayDate, timeStr, now) {
      if (!dayDate || !timeStr) return false;
      var parts = String(timeStr).split('-');
      if (parts.length === 2) {
        var s = parseDt(dayDate, parts[0].trim());
        var e = parseDt(dayDate, parts[1].trim());
        if (s && e) return now >= s && now < e;
      }
      var single = parseDt(dayDate, timeStr.trim());
      if (single) return now >= single && now < new Date(single.getTime() + 2.5 * 3600 * 1000);
      return false;
    }

    function esc(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    // 比赛总结里去掉比分:比分已在上方比分表体现,总结只讲过程/意义,避免重复。
    // 只剥离「数字-数字」形式的比分(含全场与单局、以及含比分的括号组),不碰「三局/第四局」等中文局数表述。
    function cleanSummary(t) {
      t = String(t).trim();
      // ① 含比分的括号组(全场比分、单局比分串):整组删除
      t = t.replace(/[（(][^（）()]*\d{1,2}-\d{1,2}[^（）()]*[）)]/g, '');
      // ② 以X-Y / 连续比分串(11-5、11-7 / 11-5/11-3/...):整段删除
      t = t.replace(/以?\d{1,2}-\d{1,2}([、／/]\d{1,2}-\d{1,2})*/g, '');
      // ③ 清理删除后残留的多余顿号/逗号与首尾空白
      t = t.replace(/[、，,]\s*(?=[、，,）)])/g, '');   // 标点后紧跟标点/右括号
      t = t.replace(/^\s*[、，,]+|[、，,]+\s*$/g, '');     // 首尾残留标点
      t = t.replace(/\s*（\s*/g, '（').replace(/\s*）\s*/g, '）'); // 括号靠拢
      return t.trim();
    }

    function relativeLabel(dateStr) {
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var d = new Date(dateStr + 'T00:00:00');
      d.setHours(0, 0, 0, 0);
      var diff = Math.round((d - today) / (1000 * 60 * 60 * 24));
      if (diff === 0) return '今天';
      if (diff === 1) return '明天';
      if (diff === 2) return '后天';
      return '';
    }

    function ordinal(n) {
      var s = ['th', 'st', 'nd', 'rd'];
      var v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    function ordinalizeInfo(info) {
      if (!info) return '';
      return esc(info).replace(/世界第(\d+)/g, function (_, n) { return ordinal(parseInt(n, 10)) + ''; });
    }

    // 重播归属日:默认随直播场所在日;直播 start∈[23:00,24:00) 视为前一日深夜,重播归次日;replay.date 可覆盖
    function addDays(dateStr, n) {
      var d = new Date(dateStr + 'T00:00:00');
      d.setDate(d.getDate() + n);
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    }
    function replayTargetDate(day, m) {
      if (m.replay && m.replay.date) return m.replay.date;     // 可选显式覆盖(罕见跨多日)
      var h = parseInt((m.time || '').split(':')[0], 10);
      if (!isNaN(h) && h >= 23) return addDays(day.date, 1);   // 23:00-23:59 视为前一日深夜,重播到次日
      return day.date;                                          // 00:00-06:00 已是次日凌晨,重播随当场所在日
    }
    // 重播是否已过时间:以「重播归属日 + 重播时间」与当前时间比较;用于把已播的归档到当日底部
    function isReplayPassed(day, m, now) {
      var rp = m.replay;
      if (!rp || !rp.time) return false;
      var dt = parseDt(replayTargetDate(day, m), rp.time);
      if (!dt) return false;
      return dt.getTime() < now.getTime();
    }
    // 当日重播汇总区:只列中国队相关场次(陆/港/澳/台),分两行——第一行重播时间+昨夜直播时间,第二行国旗贴选手名
    // mode: 'upcoming' = 未过时间(待看,置顶「今日重播」); 'past' = 已过时间(已播,归档到当日底部「今日已重播」)
    function renderReplayZone(dateStr, items, now, mode) {
      if (!items || !items.length) return '';
      var isPast = (mode === 'past');
      // 汇总区只展示中国队相关场次(中国大陆+中国香港+中国澳门,不含中国台北),避免外协对阵挤占老人视线
      var cnItems = items.filter(function (it) {
        var m = it.m;
        return belongsToCN(m.nationHome) || belongsToCN(m.nationAway);
      });
      // 按时间是否已过分流:upcoming 留顶部待看,past 归底部已播
      var modeItems = cnItems.filter(function (it) {
        var passed = isReplayPassed(it.day, it.m, now);
        return isPast ? passed : !passed;
      });
      if (!modeItems.length) return '';
      var rows = modeItems.map(function (it) {
        var m = it.m;
        var hasCN = belongsToCN(m.nationHome) || belongsToCN(m.nationAway);
        var hasJP = m.nationHome === '日本' || m.nationAway === '日本';
        var hasKR = m.nationHome === '韩国' || m.nationAway === '韩国';
        var scopeAttr = (hasCN ? ' data-cn="1"' : '') + ((hasJP || hasKR) ? ' data-jpkr="1"' : '');
        var rp = m.replay;
        return '<div class="replay__item"' + scopeAttr + '>' +
                 '<div class="replay__line1">' +
                   '<span class="replay__time">📺 ' + esc(rp.time) + '</span>' +
                   '<span class="replay__chan">' + esc(rp.channel) + '</span>' +
                   '<span class="replay__live">昨夜 ' + esc(m.time) + ' 直播</span>' +
                 '</div>' +
                 '<div class="replay__line2">' +
                   '<span class="replay__flag">' + flagsForSide(m.playerHome, m.playerHomeInfo, m.nationHome) + '</span>' + esc(m.playerHome) +
                   '<span class="replay__vs">VS</span>' +
                   '<span class="replay__flag">' + flagsForSide(m.playerAway, m.playerAwayInfo, m.nationAway) + '</span>' + esc(m.playerAway) +
                 '</div>' +
               '</div>';
      }).join('');
      var headTitle = isPast ? '📼 今日已重播' : '📺 今日重播';
      var boxCls = isPast ? 'day__replays day__replays--done' : 'day__replays';
      var headCls = isPast ? 'replays__head replays__head--done' : 'replays__head';
      return '<div class="' + boxCls + '">' +
               '<div class="' + headCls + '">' + headTitle + '</div>' + rows +
             '</div>';
    }

    // 解析比分字符串,返回 {homeName,homeWins,awayName,awayWins,sets:[[h,a],...]}
    function parseResult(result) {
      var s = String(result || '').trim();
      var m = s.match(/^(.+?)\s+(\d+)-(\d+)\s+(.+?)(?:[（(]([^)）]+)[)）])?$/);
      if (!m) return null;
      var homeName = m[1].trim(), awayName = m[4].trim();
      var homeWins = parseInt(m[2], 10), awayWins = parseInt(m[3], 10);
      var sets = [];
      if (m[5]) {
        m[5].split('/').forEach(function (part) {
          var nums = part.split('-');
          if (nums.length === 2) {
            var a = parseInt(nums[0], 10), b = parseInt(nums[1], 10);
            if (!isNaN(a) && !isNaN(b)) sets.push([a, b]);
          }
        });
      }
      return { homeName: homeName, homeWins: homeWins, awayName: awayName, awayWins: awayWins, sets: sets };
    }

    // 把 result 渲染成体育转播式比分表格;解析失败则回落纯文本
    function renderResult(m) {
      var p = parseResult(m.result);
      if (!p || !p.sets.length) {
        return '<div class="match__result">' + esc(m.result) + '</div>';
      }
      var out = '<div class="match__result"><div class="score-table-wrap"><table class="score-table">';
      out += '<thead><tr><th class="score-table__player"></th>';
      for (var i = 0; i < p.sets.length; i++) {
        out += '<th class="score-table__set">G' + (i + 1) + '</th>';
      }
      out += '<th class="score-table__total">总分</th></tr></thead><tbody>';
      var rows = [
        { name: p.homeName || m.playerHome, total: p.homeWins, idx: 0 },
        { name: p.awayName || m.playerAway, total: p.awayWins, idx: 1 }
      ];
      rows.forEach(function (r) {
        out += '<tr><td class="score-table__player" title="' + esc(r.name) + '">' + esc(r.name) + '</td>';
        p.sets.forEach(function (set) {
          var score = set[r.idx];
          var isWinner = score === Math.max(set[0], set[1]);
          out += '<td class="score-table__score' + (isWinner ? ' is-winner' : '') + '">' + esc(String(score)) + '</td>';
        });
        out += '<td class="score-table__total">' + esc(String(r.total)) + '</td></tr>';
      });
      out += '</tbody></table></div></div>';
      return out;
    }

    // 进行中比赛:红色横幅 + 当前比分表(复用 parseResult,配色由绿转红区分已结束)
    function renderLive(m) {
      var banner = '<div class="match__live">🔴 进行中 · 当前比分</div>';
      var p = parseResult(m.live);
      if (!p || !p.sets.length) {
        return banner + '<div class="match__result match__result--live">' + esc(m.live) + '</div>';
      }
      var out = banner + '<div class="match__result match__result--live"><div class="score-table-wrap"><table class="score-table score-table--live">';
      out += '<thead><tr><th class="score-table__player"></th>';
      for (var i = 0; i < p.sets.length; i++) {
        out += '<th class="score-table__set">G' + (i + 1) + '</th>';
      }
      out += '<th class="score-table__total">总分</th></tr></thead><tbody>';
      var rows = [
        { name: p.homeName || m.playerHome, total: p.homeWins, idx: 0 },
        { name: p.awayName || m.playerAway, total: p.awayWins, idx: 1 }
      ];
      rows.forEach(function (r) {
        out += '<td class="score-table__player" title="' + esc(r.name) + '">' + esc(r.name) + '</td>';
        p.sets.forEach(function (set) {
          var score = set[r.idx];
          var isWinner = score === Math.max(set[0], set[1]);
          out += '<td class="score-table__score' + (isWinner ? ' is-winner' : '') + '">' + esc(String(score)) + '</td>';
        });
        out += '<td class="score-table__total">' + esc(String(r.total)) + '</td></tr>';
      });
      out += '</tbody></table></div></div>';
      return out;
    }

    // 把转播窗口的冗长 content 拆成「对决」卡片,只保留阶段/双方/状态;中断/转台提示单独成注
    function renderScheduleContent(s) {
      var tournament = (s.tournament || '').trim();
      var content = String(s.content || '').trim();
      if (tournament) {
        // 去掉开头的完整赛事名(如 "WTT欧洲大满贯瑞典站...")
        if (content.indexOf(tournament) === 0) {
          content = content.slice(tournament.length).replace(/^\s*[·]\s*/, '').trim();
        }
        // 去掉开头的赛事简称(如 tournament 为 "WTT横滨冠军赛" 时去掉 "横滨冠军赛")
        var shortTournament = tournament.replace(/^(WTT|ITTF|国际乒联)\s*/, '').trim();
        if (shortTournament && content.indexOf(shortTournament) === 0) {
          content = content.slice(shortTournament.length).replace(/^\s*[·]\s*/, '').trim();
        }
      }

      var segs = content.split(/[;。]/).map(function (p) { return p.trim(); }).filter(Boolean);
      if (!segs.length) {
        return '<div class="sched__text">' + esc(content || '对阵待公布') + '</div>';
      }

      var out = '<div class="sched__list">';
      segs.forEach(function (seg) {
        var status = '';
        if (seg.indexOf('已锁定') !== -1) {
          status = '<span class="sched__status is-locked">已锁定</span>';
          seg = seg.replace(/已锁定/g, '').trim();
        }
        if (seg.indexOf('待定') !== -1) {
          status = '<span class="sched__status is-pending">待定</span>';
          seg = seg.replace(/待定/g, '').trim();
        }
        seg = seg.replace(/[;。,，]+$/, '').trim();

        var isDuel = seg.replace(/[（(].*?[）)]/g, '').indexOf('vs') !== -1;
        var isFinal = /决赛/.test(seg);
        if (isDuel || isFinal) {
          var vsIdx = seg.toLowerCase().indexOf('vs');
          var colonIdx = seg.indexOf(':');
          var stage = '', players = seg;
          // 只有 vs 前面的 ":" 才是阶段分隔(避免 18:15/19:30 这类时间里的冒号误切)
          if (vsIdx !== -1 && colonIdx !== -1 && colonIdx < vsIdx) {
            stage = seg.slice(0, colonIdx).trim();
            players = seg.slice(colonIdx + 1).trim();
          }
          // 无阶段但开头是"另一场"时,把它提作小标题
          if (!stage && players.indexOf('另一场') === 0) {
            stage = '另一场';
            players = players.slice(3).replace(/^\s*/, '');
          }
          players = esc(players).replace(/\b(vs|VS|Vs)\b/g, '<span class="sched__vs">$1</span>');
          out += '<div class="sched__duel">';
          if (stage) out += '<div class="sched__duel-stage">' + esc(stage) + '</div>';
          out += '<div class="sched__duel-players">' + players + '</div>';
          if (status) out += '<div class="sched__duel-status">' + status + '</div>';
          out += '</div>';
        } else {
          out += '<div class="sched__note">' + esc(seg) + '</div>';
        }
      });
      out += '</div>';
      return out;
    }

    // 从风险正文里提取时间冲突,生成可视化时间轴;同时返回被消耗掉的时间描述,避免在影响点里重复
    function extractTimeline(body) {
      if (!body) return { slots: [], consumed: [] };
      // 正面直播描述(并机/全程/固定/同步/无插播):不拆时间轴,让原文作为普通影响点
      if (/并机直播|全程直播|固定直播|同步直播|无插播/.test(body)) return { slots: [], consumed: [] };
      var slots = [], consumed = [];
      var pos = 0;
      // 辅助:抓节目名(《》优先,否则 2~8 个汉字),去掉末尾语气词
      function grabProgram(after) {
        var book = after.match(/^《([^》]+)》/);
        if (book) return { text: book[1], len: book[0].length };
        var plain = after.match(/^[\u4e00-\u9fa5]{2,8}/);
        if (plain) return { text: plain[0].replace(/[了呢吧啊]+$/g, ''), len: plain[0].length };
        return null;
      }
      // 1) 连续时段 HH:MM-HH:MM
      var rangeRe = /(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/g;
      body.replace(rangeRe, function (m, a, b) {
        var idx = body.indexOf(m, pos);
        pos = idx + m.length;
        var after = body.slice(pos);
        var prog = grabProgram(after.replace(/^(?:固定|连续|全程)?(?:播|转)?/, ''));
        var text = prog ? prog.text : '其他节目';
        slots.push({ type: 'block', start: a, end: b, text: text });
        // 把包含该时段的整句标为已消耗(从句首到节目名后)
        var sentStart = Math.max(0, body.lastIndexOf('，', idx) + 1, body.lastIndexOf(',', idx) + 1, body.lastIndexOf('；', idx) + 1, body.lastIndexOf(';', idx) + 1);
        var sentEnd = prog ? (pos + prog.len) : (pos + 8);
        consumed.push({ start: sentStart, end: Math.min(sentEnd, body.length) });
        return m;
      });
      // 2) 单独时间点 HH:MM
      var seen = {};
      slots.forEach(function (sl) { seen[sl.start] = 1; if (sl.end) seen[sl.end] = 1; });
      var pointRe = /(\d{1,2}:\d{2})(?!\s*-)/g;
      var match;
      while ((match = pointRe.exec(body)) !== null) {
        var t = match[1], idx = match.index;
        if (seen[t]) continue;
        var after = body.slice(idx + t.length);
        // 只把真正的冲突词当成 cut;"直播"里的"播"不算
        var isCut = /(?:^|\s).{0,10}?(?:转[成到]?|切换|换成|改播|插播|中断|暂停|不播|临时改|调整|取消)/.test(after.slice(0, 24));
        var isStart = /(?:开打|开赛|开始)/.test(after.slice(0, 16));
        var type = isCut ? 'cut' : (isStart ? 'live' : 'block');
        var text = '其他节目';
        if (type === 'live') {
          text = '开赛';
        } else {
          // 从"转/切换/换成/改播"之后开始抓节目名,避免把时间后面的"央视5"误当节目
          var cutMatch = after.match(/(?:转[成到]?|切换|换成|改播)\s*/);
          var startFrom = cutMatch ? after.slice(cutMatch.index + cutMatch[0].length) : after;
          var cleaned = startFrom.replace(/^(?:\s*(?:晚上|下午|上午))?\s*(?:就|将|会)?\s*/, '');
          var prog = grabProgram(cleaned);
          if (prog) text = prog.text;
        }
        slots.push({ type: type, start: t, end: '', text: text });
        // 消耗该时间所在的短句
        var sentStart = Math.max(0, body.lastIndexOf('，', idx) + 1, body.lastIndexOf(',', idx) + 1, body.lastIndexOf('；', idx) + 1, body.lastIndexOf(';', idx) + 1);
        var sentEnd = idx + t.length + 12;
        consumed.push({ start: sentStart, end: Math.min(sentEnd, body.length) });
      }
      slots.sort(function (a, b) { return a.start.localeCompare(b.start); });
      return { slots: slots, consumed: consumed };
    }

    // 把数据段拆成选手对比卡片,如 "A(...)对B(...)" 或 "A(...) vs B(...)"
    function renderStatCards(stat) {
      var s = esc(stat).replace(/^📊\s*/, '');
      var m = s.match(/^(.+?)\((.+?)\)\s*(?:对|vs|VS)\s*(.+?)\((.+?)\)(.*)$/);
      if (!m) return '<div class="risk__stat">' + s + '</div>';
      var rest = m[5].trim().replace(/^[，,。；;]+/, '');
      var cards = [
        { name: m[1].trim(), info: m[2].trim() },
        { name: m[3].trim(), info: m[4].trim() }
      ];
      var out = '<div class="risk__stat">📊 交手数据' +
                '<div class="risk__stat-grid">';
      cards.forEach(function (c) {
        out += '<div class="risk__stat-card">' +
                 '<div class="risk__stat-card__label">' + c.name + '</div>' +
                 '<div class="risk__stat-card__val">' + c.info + '</div>' +
               '</div>';
      });
      out += '</div>';
      if (rest) out += '<div style="margin-top:.4rem;font-size:.88rem;color:var(--ink);">' + rest + '</div>';
      out += '</div>';
      return out;
    }

    // 把风险说明字符串拆成结构化卡片:徽章/标题 + 影响点标签 + 时间轴 + 数据卡片
    // 数据源约定:🔴/✅/⚠️ 开头为严重级别,(类型)为可选短括号标注;
    // 正文中 ⚠️ 引导证据来源提示(仅用于校验,不展示),📊 引导交手数据(恒在末尾)
    function renderRisk(risk) {
      if (!risk) return '';
      var s = String(risk).trim();
      var sev = { emoji: '', label: '风险提示', type: '', cls: 'risk--mid' };
      // 冒号可选;括号内容若超长或含标点则视为正文而非类型
      var m = s.match(/^(🔴|✅|⚠️)\s*(高风险|低风险|中风险)(?:\(([^)]+)\))?[:：]?/);
      if (m) {
        var maybeType = m[3] || '';
        sev.emoji = m[1]; sev.label = m[2];
        sev.cls = m[1] === '🔴' ? 'risk--high' : (m[1] === '✅' ? 'risk--low' : 'risk--mid');
        if (maybeType.length <= 14 && !/[:：,，;；。]/.test(maybeType)) {
          sev.type = maybeType;
          s = s.slice(m[0].length).trim();
        } else {
          // 括号内容不像类型,只去掉 emoji+级别,保留括号内容
          var cutTo = m[0].indexOf(m[2]) + m[2].length;
          s = s.slice(cutTo).trim().replace(/^[（(]+|[）)]+$/g, '');
        }
      }
      var stat = '', body = s;
      var statIdx = s.lastIndexOf('📊');
      if (statIdx !== -1) { stat = s.slice(statIdx).trim().replace(/^[;；\s]+/, ''); body = s.slice(0, statIdx).trim(); }
      // 仅去掉明显是证据来源校验的套话
      body = body.replace(/(⚠️\s*)?(已对照[^。，；]*核实|来源[^。，；]*确认|证据[^。，；]*显示|当前时段无冲突|请以实际播出为准)[，,。；;]?/g, '').trim();

      // 影响点:按短句切分;已被时间轴消耗的时间描述句不再重复列出
      var tl = extractTimeline(body);
      function isConsumed(p) {
        if (!tl.slots.length) return false;
        // 若短句含 HH:MM 且基本为时间描述,认为已被时间轴覆盖
        if (/\d{1,2}:\d{2}/.test(p)) return true;
        // 若短句完全落在 consumed 区间内
        var start = body.indexOf(p);
        if (start === -1) return false;
        var end = start + p.length;
        return tl.consumed.some(function (r) { return r.start <= start && r.end >= end; });
      }
      var impacts = [];
      body.split(/[,，;；。]/).map(function (p) { return p.trim(); }).filter(Boolean).forEach(function (p) {
        var clean = p.replace(/^[（(]+|[）)]+$/g, '').trim();
        if (clean.length > 2 && !isConsumed(clean)) impacts.push(clean);
      });

      // 无实质内容的风险提示直接不渲染
      if (!impacts.length && !tl.slots.length && !stat) return '';

      var out = '<div class="match__risk ' + sev.cls + '">';
      out += '<div class="risk__head">';
      out += '<span class="risk__badge">' + esc((sev.emoji ? sev.emoji + ' ' : '') + sev.label) + '</span>';
      if (sev.type) out += '<span class="risk__type">' + esc(sev.type) + '</span>';
      out += '</div>';

      if (impacts.length) {
        out += '<div class="risk__impacts">';
        impacts.forEach(function (p) { out += '<div class="risk__impact">' + esc(p) + '</div>'; });
        out += '</div>';
      }

      if (tl.slots.length) {
        out += '<div class="risk__timeline">';
        tl.slots.forEach(function (sl) {
          var cls = 'risk__slot';
          if (sl.type === 'live') cls += ' risk__slot--live';
          else if (sl.type === 'cut') cls += ' risk__slot--cut';
          else cls += ' risk__slot--block';
          var time = sl.end ? sl.start + '-' + sl.end : sl.start;
          out += '<div class="' + cls + '"><span class="risk__slot__time">' + time + '</span>' + esc(sl.text) + '</div>';
        });
        out += '</div>';
      }

      if (stat) out += renderStatCards(stat);
      out += '</div>';
      return out;
    }

    // 国乒(中国队)定义:中国大陆 + 中国澳门;不含中国香港(用户觉得港队太菜不想看)、不含中国台北
    function belongsToCN(nation) {
      return nation === '中国' || nation === '中国澳门';
    }
    // 频道判定:外婆只看电视、只看央视。仅 CCTV 电视频道算「电视直播」,其余(咪咕/央视频/腾讯体育等 app 或流媒体)一律不算,不进表
    function isCCTVChannel(ch) {
      if (!ch) return false;
      // 显式排除非电视平台(app / 咪咕 / 其他流媒体),即便名字里带「央视」(如「央视频」)也算 app
      if (/咪咕|央视频|腾讯体育|优酷|爱奇艺|客户端|app|APP|网页|网端/i.test(ch)) return false;
      // 央视电视频道:CCTV-5 / CCTV-5+ / CCTV-1 等
      return /CCTV|央视/i.test(ch);
    }
    // 兜底:风险卡若明确提示「央视不直播 / 只上央视频/咪咕 / 请开手机APP」,即使 channel 写了 CCTV 也视为电视不可看,从外婆的表里拿掉
    function riskSaysNoTV(risk) {
      if (!risk) return false;
      var txt = risk;
      return /手机|APP|App|app|客户端|咪咕|央视频|不直播|电视上不播|电视不播|看APP|开手机|仅app|仅APP|只在.*播|只在.*看/i.test(txt);
    }
    function isTVMatch(m) {
      return isCCTVChannel(m.channel) && !riskSaysNoTV(m.risk);
    }
    // 重播是否在央视电视播:只看「重播自身频道」(replay.channel),不看直播频道/直播风险卡
    // —— 直播当晚可能只在 app/咪咕,但白天重播照样上央视电视,外婆能在电视看重播,必须显示
    function isTVReplay(m) {
      return !!(m.replay && m.replay.channel && isCCTVChannel(m.replay.channel));
    }
    // 某天是否「有节目」:有≥1场央视电视可看比赛,或有≥1个央视乒乓球直播窗口(待公布也算有节目)。
    // 两者皆无的日子(赛程空档、无电视窗口)视为无节目,从日期序列里折叠跳过,直接跳到下一场有节目的日期。
    function dayHasContent(day) {
      if ((day.matches || []).filter(isTVMatch).length) return true;
      // 有视频平台直播(咪咕/央视频)也算「有节目」——空窗期外婆在手机上仍有比赛可看,
      // 不应被折叠跳过;只有电视无直播、视频也无直播、且无任何说明的天才是真空档。
      if ((day.videoMatches || []).length) return true;
      // 有赛程说明(含空窗期/录像说明)即视为有内容——这是外婆关心的「今日央视乒乓情况」,
      // 不应被折叠;只有既无比赛、又无任何说明的天才是真空档,才会被跳过。
      if ((day.schedule || []).length) return true;
      return false;
    }

    // 把空窗期/录像说明天的一坨长文本拆成结构化项:
    //   lead       — 摘要(第一个 CCTV 之前的文字)
    //   pingpong[] — 乒乓节目(录像/典藏):{channel, time, program}
    //   other[]    — 其他体育节目:{channel, time, program}
    //   next       — 「下一场/下一站...」一句(若原文有)
    //   nextSquad[]  — 下一站国乒出战名单:{name, rank, raw}
    //   nextAbsent[] — 缺席主力:{name, reason}
    // 客户端解析、容错优先:任意项缺失时降级显示,绝不可让卡片消失。
    function parseNoteToItems(note) {
      var out = { lead: '', pingpong: [], other: [], next: '', nextSquad: [], nextAbsent: [] };
      if (!note) return out;
      var s = String(note).trim();
      if (!s) return out;

      // 1. 抽出「下一场/下一站...」句
      var nm = s.match(/(下一[场站][^。]*?。)/);
      if (nm) {
        out.next = nm[1].replace(/[。;,]+$/, '').trim();
        s = s.replace(nm[1], '').trim();
      }

      // 1b. 从「下一站...」句再拆出战名单与缺席主力(格式约定见采集说明.md §4.6)
      var roster = parseNextRoster(out.next);
      out.nextSquad = roster.squad;
      out.nextAbsent = roster.absent;

      // 2. 按 。/;/； 分句
      var clauses = s.split(/[。;；]/).map(function (c) { return c.trim(); }).filter(Boolean);

      var items = [];
      var lastChannel = '';

      clauses.forEach(function (clause) {
        // 单次正则按文档顺序匹配 CCTV 槽或裸时间 → 裸时间才能正确继承最近的 CCTV 频道
        var slots = [];
        var re = /(CCTV-\d+\+?)\s+(\d{1,2}:\d{2})|\b(\d{1,2}:\d{2})\b/g;
        var mm;
        while ((mm = re.exec(clause)) !== null) {
          if (mm[1]) {
            slots.push({ channel: mm[1], time: mm[2], start: mm.index, endIdx: mm.index + mm[0].length });
            lastChannel = mm[1];
          } else {
            slots.push({ channel: lastChannel, time: mm[3], start: mm.index, endIdx: mm.index + mm[0].length });
          }
        }
        slots.sort(function (a, b) { return a.start - b.start; });

        // 每个槽的描述 = 槽后到下一槽之前的文字(去除前导动词/分隔符、尾部分隔符/括号)
        var clauseItems = [];
        for (var i = 0; i < slots.length; i++) {
          var descStart = slots[i].endIdx;
          var descEnd = i + 1 < slots.length ? slots[i+1].start : clause.length;
          var desc = clause.substring(descStart, descEnd).trim();
          desc = desc.replace(/^[、,，与和\/\s为播转是()（）]+/, '').trim();
          desc = desc.replace(/[、,，与和\/\(\)（）。]+$/, '').trim();
          clauseItems.push({ channel: slots[i].channel, time: slots[i].time, program: desc });
        }

        // 填空白 desc(同节目跨频道写法如「CCTV-5 14:00 与 19:30、CCTV-5+ 17:00 为羽毛球...」,
        // 前两槽没有 desc 文字,向前后继承最近的非空 desc)
        var lastDesc = '';
        for (var i = 0; i < clauseItems.length; i++) {
          if (clauseItems[i].program) lastDesc = clauseItems[i].program;
          else if (lastDesc) clauseItems[i].program = lastDesc;
        }
        var nextDesc = '';
        for (var i = clauseItems.length - 1; i >= 0; i--) {
          if (clauseItems[i].program) nextDesc = clauseItems[i].program;
          else if (nextDesc) clauseItems[i].program = nextDesc;
        }

        clauseItems.forEach(function (it) { if (it.program) items.push(it); });
      });

      // 3. 按时段排序
      items.sort(function (a, b) { return a.time.localeCompare(b.time); });

      // 4. 分类(乒乓 vs 其他体育):负向(其他运动)优先,正向(乒乓)其次,都不命中默认归"其他"
      //    关键:不能用「决赛」「录像」「锦标赛」等通用词当乒乓信号——
      //    否则「羽毛球世锦赛1/4决赛 直播」会因含「决赛」/「锦标赛」误判进乒乓节目
      var noping = /羽毛球|中超|足球|篮球|排球|网球|游泳|田径|跳水|赛车|F1|拳击|摔跤|体操|艺术体操|围棋|象棋|电竞|斯诺克|台球|高尔夫|马拉松|举重|射击|射箭|击剑|皮划艇|赛艇|帆船|自行车|马术|空手道|跆拳道|柔道|冰球|花样滑冰|短道速滑|速滑|冬奥|滑雪|冰壶|蹦床|攀岩|冲浪|棒球|橄榄球|板球|手球|水球|铁人三项/;
      var pp     = /乒乓|WTT|世乒|冠军赛|大满贯|奥运|男单|女单|男双|女双|混双|瑞典|横滨|团体/;
      items.forEach(function (it) {
        if (noping.test(it.program)) { out.other.push(it); return; }
        if (pp.test(it.program)) { out.pingpong.push(it); return; }
        out.other.push(it); // 既无负向也无乒乓信号 → 默认归"其他"(不假设乒乓)
      });

      // 5. 摘要 = 第一个 CCTV 之前的文字
      var firstCctv = s.search(/CCTV/);
      out.lead = (firstCctv > 0 ? s.substring(0, firstCctv) : s).trim();
      out.lead = out.lead.replace(/[,:;。\s()（）]+$/, '').trim();

      return out;
    }

    // 「下一站...」句里拆出出战名单与缺席主力。
    // 格式约定(采集说明.md §4.6):
    //   出战:男单王楚钦(世界第1)/林诗栋(世界第2)/温瑞博/向鹏/周启豪,女单蒯曼(2号种子)/...
    //   缺席:孙颖莎(轮休备战亚运)、王曼昱(轮休备战亚运)
    // 括号内原文(名次/种子/备注)原样保留为 rankLabel 展示,不解析数字——避免把
    // 「2号种子」误当「世界第2」这类错误信息;缺标签/缺原因不影响入列。
    // 性别识别:「男单/男双/男团」标记男队、「女单/女双/女团」标记女队,
    // 同段内无前缀的名字继承前一个性别(如「女单蒯曼/陈幸同」中陈幸同=女队)。
    function parseNextRoster(nextLine) {
      var squad = [], absent = [];
      if (!nextLine) return { squad: squad, absent: absent };

      // 出战段:到「缺席」或段尾为止(去掉句尾标点)
      var sm = nextLine.match(/出战[:：]([\s\S]*?)(?=缺席[:：]|$)/);
      if (sm) {
        var sPart = sm[1].replace(/[。;；,，]+$/, '').trim();
        var curGender = ''; // 继承用:男/女
        // 按 / 或 、 或逗号拆人名(可能含「女单蒯曼」这种前缀,拆后去前缀)
        sPart.split(/[\/、,，]/).forEach(function (raw) {
          var name = raw.trim();
          if (!name) return;
          var g = name.match(/^(男单|男双|男团|女单|女双|女团|混双)/);
          var gender = curGender;
          if (g) {
            // 混双不设性别(选手本身属于男/女队),继承当前组;男单/女单等明确分组
            if (/^女/.test(g[1])) { gender = '女'; curGender = '女'; }
            else if (/^男/.test(g[1])) { gender = '男'; curGender = '男'; }
            name = name.replace(/^(男单|男双|男团|女单|女双|女团|混双)/, '').trim();
          }
          if (!name) return;
          var rankLabel = '';
          var m = name.match(/^([^\(（]+?)\s*[\(（]([^\)）]+)[\)）]\s*$/);
          if (m) {
            name = m[1].trim();
            rankLabel = m[2].trim();
          }
          squad.push({ name: name, rankLabel: rankLabel, gender: gender });
        });
      }

      // 缺席段:到段尾(去掉句尾标点)
      var am = nextLine.match(/缺席[:：]([\s\S]*?)$/);
      if (am) {
        am[1].replace(/[。;；,，]+$/, '').trim().split(/[、,，]/).forEach(function (raw) {
          var name = raw.trim();
          if (!name) return;
          var reason = '';
          var m = name.match(/^([^\(（]+?)\s*[\(（]([^\)）]+)[\)）]\s*$/);
          if (m) {
            name = m[1].trim();
            reason = m[2].trim();
          }
          absent.push({ name: name, reason: reason });
        });
      }
      return { squad: squad, absent: absent };
    }

    // 「下一站国乒赛事」卡片里 nextEvent.note 也是一坨长文本,这里按语义拆成结构化块
    function parseNextEventNote(note) {
      var out = { meta: '', squad: '', seeds: '', schedule: '', tv: '', sources: '' };
      if (!note) return out;
      var s = String(note).trim();
      if (!s) return out;

      // 1. 抽取尾部「(…源确认 / …官方…)」括号作为信息来源
      var srcM = s.match(/\(([^()]*?(?:源|官方|WTT|ITTF)[^()]*?)\)[。;；]?\s*$/);
      if (srcM) {
        out.sources = srcM[1].trim();
        s = s.slice(0, srcM.index).trim();
      }

      // 2. 按 。/;/； 分句,按关键词归类
      var clauses = s.split(/[。;；]/).map(function (c) { return c.trim(); }).filter(Boolean);
      if (!clauses.length) return out;

      // 首句 = 赛事名/场馆/日期/赛制,固定为元信息
      out.meta = clauses[0];

      clauses.slice(1).forEach(function (cl) {
        var isTV    = /CCTV|直播|转播|播出|节目单|频道/.test(cl);
        var isSched = /赛程|开打|1\/8|1\/4|半决赛|决赛|七局|小组赛|资格赛|→|对阵|签表/.test(cl);
        var isSeeds = /种子|卫冕|复出|头号|夺冠|夺金|冲冠|排名|看点|焦点/.test(cl);
        var isSquad = /国乒|轮休|阵容|报名|队员|选手|出战|参赛/.test(cl);

        if (isTV) {
          out.tv = (out.tv ? out.tv + '；' : '') + cl;
        } else if (isSeeds) {
          out.seeds = (out.seeds ? out.seeds + '；' : '') + cl;
        } else if (isSched) {
          out.schedule = (out.schedule ? out.schedule + '；' : '') + cl;
        } else if (isSquad) {
          out.squad = (out.squad ? out.squad + '；' : '') + cl;
        } else {
          out.meta = (out.meta ? out.meta + '。' : '') + cl;
        }
      });

      return out;
    }

    // 把解析结果渲染成清晰分块(适老化:大字号、左对齐、分节标题)
    function renderNextCard(ne) {
      var p = parseNextEventNote(ne.note || '');
      var blocks = [];
      if (p.meta)     blocks.push({ key: 'meta',     label: '🏟️ 赛事信息',  text: p.meta });
      if (p.squad)    blocks.push({ key: 'squad',    label: '🇨🇳 国乒阵容', text: p.squad });
      if (p.seeds)    blocks.push({ key: 'seeds',    label: '⭐ 焦点与种子', text: p.seeds });
      if (p.schedule) blocks.push({ key: 'schedule', label: '🗓️ 赛程时间线', text: p.schedule });
      if (p.tv)       blocks.push({ key: 'tv',       label: '📺 直播安排',  text: p.tv });
      if (p.sources)  blocks.push({ key: 'sources',  label: '🔎 信息来源',  text: p.sources });

      if (!blocks.length) {
        return '<div class="day__next">' + esc(ne.note || '具体赛程待官方公布') + '</div>';
      }

      var html = '<div class="day__next day__next--structured">';
      blocks.forEach(function (b) {
        var boxCls = b.key === 'meta' ? ' next__block--hero' : (b.key === 'sources' ? ' next__block--sources' : '');
        html += '<div class="next__block' + boxCls + '">';
        html +=   '<div class="next__head">' + b.label + '</div>';
        if (b.key === 'schedule') {
          var steps = b.text.split('→').map(function (x) { return x.trim(); }).filter(Boolean);
          html += '<ol class="next__timeline">';
          steps.forEach(function (st) { html += '<li>' + esc(st) + '</li>'; });
          html += '</ol>';
        } else {
          html += '<div class="next__body">' + esc(b.text) + '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
      return html;
    }

    // 紧凑版:用于「今日无直播」「待公布」等小卡里的「下一场」一行(只点要点,不堆整段 note)
    // omitCountdown=true 时去掉「距今天 X 天」(该倒数已上移到顶部「近期无比赛」横幅,避免重复)
    function nextEventCompact(ne, omitCountdown) {
      if (!ne) return '';
      var p = parseNextEventNote(ne.note || '');
      var name = '';
      if (p.meta) {
        var m = p.meta.match(/^([^(（]+)/);
        if (m) name = m[1].trim();
      }
      var parts = [];
      if (name) parts.push(name);
      if (ne.date) parts.push(ne.date + (ne.weekday ? '(' + ne.weekday + ')' : ''));
      if (!omitCountdown && typeof ne.daysAway === 'number') parts.push('距今天 ' + ne.daysAway + ' 天');
      if (p.tv) {
        var ch = p.tv.match(/CCTV[-\d+]+/);
        if (ch) parts.push(ch[0] + ' 预计直播');
      }
      return parts.join(' · ');
    }
    // 去掉日期版本(用于已经把日期加粗展示的场景,避免重复)
    function nextEventCompactNoDate(ne, omitCountdown) {
      if (!ne) return '';
      var p = parseNextEventNote(ne.note || '');
      var name = '';
      if (p.meta) {
        var m = p.meta.match(/^([^(（]+)/);
        if (m) name = m[1].trim();
      }
      var parts = [];
      if (name) parts.push(name);
      if (!omitCountdown && typeof ne.daysAway === 'number') parts.push('距今天 ' + ne.daysAway + ' 天');
      if (p.tv) {
        var ch = p.tv.match(/CCTV[-\d+]+/);
        if (ch) parts.push(ch[0] + ' 预计直播');
      }
      return parts.join(' · ');
    }

    // 国籍筛选:默认国乒。标签页点选后隐藏不匹配的比赛卡,并隐藏因此变空的日期段
    var FILTER = 'cn';
    function applyFilter(scope) {
      FILTER = scope;
      document.querySelectorAll('.match').forEach(function (el) {
        var show = scope === 'all' ||
          (scope === 'cn' && el.dataset.cn) ||
          (scope === 'jpkr' && el.dataset.jpkr);
        el.style.display = show ? '' : 'none';
      });
      // 重播汇总区的每条按来源比赛国籍跟随筛选(卡内重播行随整卡走,无需另处理)
      document.querySelectorAll('.replay__item').forEach(function (el) {
        var show = scope === 'all' ||
          (scope === 'cn' && el.dataset.cn) ||
          (scope === 'jpkr' && el.dataset.jpkr);
        el.style.display = show ? '' : 'none';
      });
      // 视频平台场次跟随「全部/国乒/日韩」筛选(与比赛卡一致)
      document.querySelectorAll('.vmatch').forEach(function (el) {
        var show = scope === 'all' ||
          (scope === 'cn' && el.dataset.cn) ||
          (scope === 'jpkr' && el.dataset.jpkr);
        el.style.display = show ? '' : 'none';
      });
      document.querySelectorAll('.day').forEach(function (sec) {
        var anyVisible = false;
        sec.querySelectorAll('.match').forEach(function (m) { if (m.style.display !== 'none') anyVisible = true; });
        sec.querySelectorAll('.replay__item').forEach(function (r) { if (r.style.display !== 'none') anyVisible = true; });
        sec.querySelectorAll('.vmatch').forEach(function (r) { if (r.style.display !== 'none') anyVisible = true; });
        var hasStatic = sec.querySelector('.day__pending');
        sec.style.display = (anyVisible || hasStatic) ? '' : 'none';
        // 某天筛选后无可见重播,则隐藏对应重播区(upcoming/past 两个区分别处理,不留空标题)
        sec.querySelectorAll('.day__replays').forEach(function (rep) {
          var anyRep = false;
          rep.querySelectorAll('.replay__item').forEach(function (r) { if (r.style.display !== 'none') anyRep = true; });
          rep.style.display = anyRep ? '' : 'none';
        });
      });
    }
    document.getElementById('filter').addEventListener('click', function (e) {
      var btn = e.target.closest('.filter__btn');
      if (!btn) return;
      document.querySelectorAll('.filter__btn').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      applyFilter(btn.dataset.scope);
      // 切换 tab 时回到页面最顶上,避免停在原滚动位置
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });

    // 视频平台直播块(咪咕/央视频):仅当天无央视电视直播时兜底显示(见 render 调用点)。
    // 明确标注「电视上看不到,需用手机/平板/电脑看」,与外婆的央视电视卡视觉区分(紫色强调)。
    // 字段与 day.matches 对齐(time/platform/tournament/stage/nation*/player*/player*Info/note),
    // 因此可直接复用 flagsForSide / ordinalizeInfo / belongsToCN / isLiveMatch 等既有逻辑。
    function renderVideoBlock(day, now) {
      var vms = (day.videoMatches || []).slice().filter(function (m) { return !!m; });
      if (!vms.length) return '';
      vms.sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });
      var rows = vms.map(function (m) {
        var live = isLiveMatch(day, m, now);
        var hasCN = belongsToCN(m.nationHome) || belongsToCN(m.nationAway);
        var hasJP = m.nationHome === '日本' || m.nationAway === '日本';
        var hasKR = m.nationHome === '韩国' || m.nationAway === '韩国';
        var scopeAttr = (hasCN ? ' data-cn="1"' : '') + ((hasJP || hasKR) ? ' data-jpkr="1"' : '');
        var eventLabel = (m.tournament ? '🏆 ' + esc(m.tournament) : '') +
                         (m.tournament && m.stage ? ' · ' : '') +
                         (m.stage ? esc(m.stage) : '');
        var homeInfo = ordinalizeInfo(m.playerHomeInfo);
        var awayInfo = ordinalizeInfo(m.playerAwayInfo);
        return '<article class="vmatch' + (live ? ' vmatch--live' : '') + '"' + scopeAttr + '>' +
          (eventLabel ? '<div class="vmatch__event">' + eventLabel + '</div>' : '') +
          '<div class="vmatch__bar">' +
            '<span class="vmatch__time">' + esc(m.time) + '</span>' +
            '<span class="vmatch__chan">' + esc(m.platform || '视频平台') + '</span>' +
            (live ? '<span class="live-badge">直播中</span>' : '') +
          '</div>' +
          '<div class="match__players">' +
            '<div class="player player--home">' +
              '<span class="player__flag">' + flagsForSide(m.playerHome, m.playerHomeInfo, m.nationHome) + '</span>' +
              '<span class="player__name">' + esc(m.playerHome) + '</span>' +
              '<span class="player__meta">' + homeInfo + '</span>' +
            '</div>' +
            '<span class="player__vs">VS</span>' +
            '<div class="player player--away">' +
              '<span class="player__flag">' + flagsForSide(m.playerAway, m.playerAwayInfo, m.nationAway) + '</span>' +
              '<span class="player__name">' + esc(m.playerAway) + '</span>' +
              '<span class="player__meta">' + awayInfo + '</span>' +
            '</div>' +
          '</div>' +
          (m.note ? '<div class="vmatch__note">' + esc(m.note) + '</div>' : '') +
        '</article>';
      }).join('');
      return '<div class="day__video" role="region" aria-label="视频平台直播(咪咕/央视频)">' +
               '<div class="day__video-head">' +
                 '<span class="day__video-title">📱 视频平台直播</span>' +
               '</div>' +
               '<p class="day__video-warn">⚠️ 电视上看不到，需用手机 / 平板 / 电脑看</p>' +
               rows +
             '</div>';
    }

    // ===== 渲染拆分:prepareCtx(派生数据) + renderDaySection(单日) + buildAbove/Below(分段) =====
    // 同步壳层(表头/时钟/筛选条/页脚)在 app.js 启动即出,不画骨架;只有异步数据区(#days 全部内容)在
    // 「无缓存且网络未回」时才显示骨架。renderFull=整页(缓存瞬显/后台刷新/轮询);renderStaged=渐进式。

    // 预计算所有派生数据(两段渲染共用,避免重复计算)
    function prepareCtx(data) {
      var now = new Date();
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var daysAll = (data.days || []).map(function (day) {
        var d = new Date(day.date + 'T00:00:00');
        d.setHours(0, 0, 0, 0);
        return { day: day, diff: Math.round((d - today) / 86400000) };
      });
      var upcoming = daysAll.filter(function (x) { return x.diff >= 0; })
                            .sort(function (a, b) { return a.diff - b.diff; });
      var past = daysAll.filter(function (x) { return x.diff < 0; })
                        .sort(function (a, b) { return b.diff - a.diff; });
      var upcomingContent = upcoming.filter(function (x) { return dayHasContent(x.day); });
      var pastContent = past.filter(function (x) { return (x.day.matches || []).filter(isTVMatch).length > 0; });
      var ordered = upcomingContent.concat(pastContent);
      var GAP_DAYS = 3;
      var nearestMatchDiff = null;
      for (var gi = 0; gi < upcoming.length; gi++) {
        if ((upcoming[gi].day.matches || []).filter(isTVMatch).length > 0) {
          nearestMatchDiff = upcoming[gi].diff; break;
        }
      }
      var gapMode = (nearestMatchDiff === null) || (nearestMatchDiff > GAP_DAYS);
      var countdownDays = null;
      if (nearestMatchDiff !== null) countdownDays = nearestMatchDiff;
      else if (data.nextEvent && typeof data.nextEvent.daysAway === 'number') countdownDays = data.nextEvent.daysAway;
      var replayGroups = {};
      ordered.forEach(function (x) {
        (x.day.matches || []).forEach(function (m) {
          if (isTVReplay(m)) {
            var td = replayTargetDate(x.day, m);
            (replayGroups[td] = replayGroups[td] || []).push({ day: x.day, m: m });
          }
        });
      });
      return {
        now: now, upcoming: upcoming, past: past,
        upcomingContent: upcomingContent, pastContent: pastContent, ordered: ordered,
        gapMode: gapMode, countdownDays: countdownDays, replayGroups: replayGroups
      };
    }

    // 空窗期长文本条目列表(原 render 内 renderItemList,抽成纯函数返回字符串)
    function renderItemListHtml(sectionCls, headLabel, list) {
      if (!list.length) return '';
      var h = '<div class="pending__section ' + sectionCls + '">' +
                '<div class="pending__section-head">' + esc(headLabel) + '</div>' +
                '<ul class="pending__list">';
      list.forEach(function (it) {
        h += '<li class="pending__row">' +
               '<div class="pending__meta">' +
                 '<span class="pending__time">' + esc(it.time) + '</span>' +
                 '<span class="pending__chan">' + esc(it.channel || 'CCTV') + '</span>' +
               '</div>' +
               '<div class="pending__prog">' + esc(it.program) + '</div>' +
             '</li>';
      });
      h += '</ul></div>';
      return h;
    }
    // 出战名单按性别分组(原 render 内 rosterGroup,抽成纯函数)
    function rosterGroupHtml(squad, gender, label) {
      var group = squad.filter(function (p) { return p.gender === gender; });
      if (!group.length) return '';
      var h = '<div class="pending__roster-line">' +
                '<span class="roster-line-label">' + esc(label) + '</span>' +
                '<ul class="pending__roster-list">';
      group.forEach(function (p) {
        h += '<li class="pending__roster-item">' +
              '<span class="roster-name">' + esc(p.name) + '</span>' +
              (p.rankLabel ? '<span class="roster-rank">' + esc(p.rankLabel) + '</span>' : '') +
             '</li>';
      });
      h += '</ul></div>';
      return h;
    }

    // 单日 section 渲染(原 render 的 ordered.forEach 体,抽成纯函数,供 above/below 复用)
    function renderDaySection(x, ctx, data) {
      var day = x.day, diff = x.diff, now = ctx.now, gapMode = ctx.gapMode;
      var tvMatches = (day.matches || []).filter(isTVMatch);
      var rel = '', tagClass = 'tag--soon', dayClass = '';
      if (diff === 0) { rel = '今天'; tagClass = 'tag--today'; dayClass = ' day--today'; }
      else if (diff === 1) { rel = '明天'; }
      else if (diff === 2) { rel = '后天'; }
      else if (diff === -1) { rel = '昨日战报'; tagClass = 'tag--past'; dayClass = ' day--past'; }
      else if (diff < -1) { rel = '已结束'; tagClass = 'tag--past'; dayClass = ' day--past'; }

      var html = '';
      html = '<section class="day' + dayClass + '">';
      html += '<div class="day__head">' +
                '<div class="day__when">' +
                  '<span class="day__date">' + esc(day.date) + '</span>' +
                  '<span class="day__week">' + esc(day.weekday) + '</span>' +
                '</div>' +
                '<div class="day__tags">' +
                  (rel ? '<span class="tag ' + tagClass + '">' + esc(rel) + '</span>' : '') +
                  '<span class="tag tag--muted">' + (tvMatches.length ? tvMatches.length + ' 场' : '待公布') + '</span>' +
                '</div>' +
              '</div>';

      html += renderReplayZone(day.date, ctx.replayGroups[day.date], now, 'upcoming');

      if (tvMatches.length) {
        // 已完成(有 result)的比赛排到当日最后面;未完成的按时间升序在前
        var matches = tvMatches.slice().sort(function (a, b) {
          var ad = a.result ? 1 : 0, bd = b.result ? 1 : 0;
          if (ad !== bd) return ad - bd;
          return (a.time || '').localeCompare(b.time || '');
        });
        // 首个「已结束」比赛之前插一条分隔,让「当日最后面」一眼可见
        var firstDone = -1;
        for (var mi = 0; mi < matches.length; mi++) { if (matches[mi].result) { firstDone = mi; break; } }
        var sepNeeded = firstDone > 0;
        matches.forEach(function (m, mi) {
          if (mi === firstDone && sepNeeded) {
            html += '<div class="match-sep"><span>已结束</span></div>';
          }
          var live = isLiveMatch(day, m, now);
          var hasCN = belongsToCN(m.nationHome) || belongsToCN(m.nationAway);
          var hasJP = m.nationHome === '日本' || m.nationAway === '日本';
          var hasKR = m.nationHome === '韩国' || m.nationAway === '韩国';
          var scopeAttr = (hasCN ? ' data-cn="1"' : '') +
                          ((hasJP || hasKR) ? ' data-jpkr="1"' : '');
          html += '<article class="match' + (live ? ' match--live' : '') + '"' + scopeAttr + '">';
          var eventLabel = (m.tournament ? '🏆 ' + esc(m.tournament) : '') +
                           (m.tournament && m.stage ? ' · ' : '') +
                           (m.stage ? esc(m.stage) : '');
          if (eventLabel) html += '<div class="match__event">' + eventLabel + '</div>';
          html += '<div class="match__bar">' +
                    '<span class="match__time">' + esc(m.time) + '</span>' +
                    '<span class="match__chan">' + esc(m.channel) + '</span>' +
                    (live ? '<span class="live-badge">直播中</span>' : '') +
                  '</div>';
          var homeInfo = ordinalizeInfo(m.playerHomeInfo);
          var awayInfo = ordinalizeInfo(m.playerAwayInfo);
          html += '<div class="match__players">' +
                    '<div class="player player--home">' +
                      '<span class="player__flag">' + flagsForSide(m.playerHome, m.playerHomeInfo, m.nationHome) + '</span>' +
                      '<span class="player__name">' + esc(m.playerHome) + '</span>' +
                      '<span class="player__meta">' + homeInfo + '</span>' +
                    '</div>' +
                    '<span class="player__vs">VS</span>' +
                    '<div class="player player--away">' +
                      '<span class="player__flag">' + flagsForSide(m.playerAway, m.playerAwayInfo, m.nationAway) + '</span>' +
                      '<span class="player__name">' + esc(m.playerAway) + '</span>' +
                      '<span class="player__meta">' + awayInfo + '</span>' +
                    '</div>' +
                  '</div>';
          if (m.result) {
            html += renderResult(m);
            if (m.summary) {
              html += '<div class="match__note note--summary">' +
                        '<div class="note__head">📝 比赛总结</div>' +
                        '<div class="note__body">' + esc(cleanSummary(m.summary)) + '</div>' +
                      '</div>';
            }
          } else if (m.live) {
            // 进行中:红色横幅 + 当前比分表;转播风险仍提示(电视看不全等)
            html += renderLive(m);
            if (m.risk) html += renderRisk(m.risk);
          } else {
            if (m.risk) html += renderRisk(m.risk);
            if (m.watchpoint) {
              html += '<div class="match__note note--watch">' +
                        '<div class="note__head">👀 看点</div>' +
                        '<div class="note__body">' + esc(m.watchpoint) + '</div>' +
                      '</div>';
            }
          }
          // 重播:卡内一行(带场次上下文);归属日 ≠ 当场所在日时标注「次日重播」;已过时间改「已重播」
          if (m.replay) {
            var rTd = replayTargetDate(day, m);
            var rNote = (rTd !== day.date) ? ' <span class="replay__note">（次日重播）</span>' : '';
            var rPassed = isReplayPassed(day, m, now);
            var rLabel = rPassed ? '📼 已重播 ' : '📺 重播 ';
            html += '<div class="match__replay">' +
                      '<span class="replay__time">' + rLabel + esc(m.replay.time) + '</span>' +
                      '<span class="replay__chan">' + esc(m.replay.channel) + '</span>' +
                      '<span class="replay__flag">' + flagsForSide(m.playerHome, m.playerHomeInfo, m.nationHome) + ' ' + flagsForSide(m.playerAway, m.playerAwayInfo, m.nationAway) + '</span>' +
                      '<span class="replay__live">昨夜 ' + esc(m.time) + ' 直播</span>' + rNote +
                    '</div>';
          }
          html += '</article>';
        });
      } else {
        // ⬇️ 无央视电视直播时,若视频平台(咪咕/央视频)有直播,兜底显示——外婆可手机/平板看。
        // 仅兜底:有央视电视直播的日子(走上方 if 分支)不显示视频块,避免和外婆的电视搞混。
        var videoHtml = renderVideoBlock(day, now);
        if (videoHtml) html += videoHtml;

        // 只保留「乒乓球」直播窗口:剔除录像/录播,以及篮球/网球/田径/斯诺克/体育新闻等非乒乓球栏目
        var liveSchedule = (day.schedule || []).filter(function (s) {
          var txt = ((s.tournament || '') + ' ' + (s.content || '')).toLowerCase();
          if (txt.indexOf('录像') !== -1 || txt.indexOf('录播') !== -1) return false;
          if (!isCCTVChannel(s.channel)) return false;   // 只保留央视电视窗口,app/咪咕不进表
          var tt = ['乒乓','wtt','世乒','冠军赛','大满贯','世界杯','锦标','单打','双打','团体','混双','男单','女单','男双','女双','决赛'];
          return tt.some(function (k) { return txt.indexOf(k) !== -1; });
        });

        if (liveSchedule.length) {
          // 待公布:精简,直接说下一场时间,不堆解释
          var firstS = liveSchedule.slice().sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); })[0];
          var nextTime = (firstS.time || '').split('-')[0] || '';
          var nextEv = firstS.tournament || firstS.channel || '乒乓球直播';
          html += '<div class="day__pending">' +
                    '<span class="pending__badge">📋 待公布</span>' +
                    '<span class="pending__next">下一场：<strong>' + esc(nextTime) + '</strong> ' + esc(nextEv) + '</span>' +
                  '</div>';
          html += '<div class="sched">';
          liveSchedule.forEach(function (s) {
            var sLive = isLiveSchedule(day.date, s.time, now);
            var tp = (s.time || '').split('-');
            var timeHtml = '<span class="sched__time-start">' + esc(tp[0] || '') + '</span>' +
                           (tp[1] ? '<span class="sched__time-end">' + esc(tp[1]) + '</span>' : '');
            html += '<div class="sched__row' + (sLive ? ' sched__row--live' : '') + '">' +
                      '<span class="sched__time">' + timeHtml + '</span>' +
                      '<div class="sched__main">' +
                        '<span class="sched__chan">' + esc(s.channel) + '</span>' +
                        (sLive ? ' <span class="live-badge">直播中</span>' : '') +
                        renderScheduleContent(s) +
                      '</div>' +
                    '</div>';
          });
          html += '</div>';
        } else if ((day.schedule || []).length) {
          // 空窗期/无直播天:当日有赛程说明。把一坨长文本解析成结构化清单(摘要 + 乒乓节目 + 其他体育 + 下一场),
          // 比平铺一段文字对外婆友好得多。解析失败时回退到原始文本展示,绝不丢内容。
          var rawNote = (day.schedule || []).map(function (s) { return (s.content || s.tournament || '').trim(); })
                                  .filter(Boolean).join(' ');
          var parsed = parseNoteToItems(rawNote);
          html += '<div class="day__pending day__pending--none">';
          html +=   '<span class="pending__badge">📺 今日无直播</span>';
          if (parsed.lead) {
            html += '<p class="pending__lead">' + esc(parsed.lead) + '</p>';
          }
          html += renderItemListHtml('pending__section--pp', '🏓 乒乓节目(录像/典藏)', parsed.pingpong);
          // 外婆只对国乒感兴趣,「其他体育」(羽毛球/中超等)不展示

          // 下一场:优先用原文里的「下一场/下一站...」句(更简洁),无则兜底用全局 nextEvent
          var nextLine = parsed.next;
          if (!nextLine && data.nextEvent && data.nextEvent.date) {
            nextLine = nextEventCompact(data.nextEvent, gapMode);
          }
          if (nextLine) {
            // 摘要 = 「出战:」之前的赛事概要(出战/缺席明细已拆到下方列表,避免重复)
            var summary = nextLine;
            var cutIdx = summary.search(/出战[:：]/);
            if (cutIdx > -1) {
              summary = summary.substring(0, cutIdx).replace(/[、,，\s]+$/, '').trim();
            }
            html += '<div class="pending__next-event">' +
                      '<span class="pending__next-label">📅 下一场国乒直播</span>' +
                      '<span class="pending__next-text">' + esc(summary) + '</span>';

            // 出战名单(仅当从原文解析出时展示;兜底无名单则不渲染,保持旧版单行)
            // 男队/女队分行展示(解析时按「男单/女单...」前缀标记 gender,同段继承)
            if (parsed.nextSquad && parsed.nextSquad.length) {
              html += '<div class="pending__roster pending__roster--squad">' +
                        '<div class="pending__roster-head">🇨🇳 国乒出战 ' + parsed.nextSquad.length + ' 人</div>' +
                        rosterGroupHtml(parsed.nextSquad, '男', '男队') +
                        rosterGroupHtml(parsed.nextSquad, '女', '女队') +
                      '</div>';
            }

            // 缺席主力
            if (parsed.nextAbsent && parsed.nextAbsent.length) {
              html += '<div class="pending__roster pending__roster--absent">' +
                        '<div class="pending__roster-head">😴 缺席主力</div>' +
                        '<ul class="pending__roster-list">';
              parsed.nextAbsent.forEach(function (p) {
                html += '<li class="pending__roster-item">' +
                          '<span class="roster-name">' + esc(p.name) + '</span>' +
                          (p.reason ? '<span class="roster-reason">' + esc(p.reason) + '</span>' : '') +
                        '</li>';
              });
              html += '</ul></div>';
            }

            html += '</div>';
          }

          // 解析失败/解析结果为空:回退到原文(防止空卡)
          // 其他体育不展示,故"是否为空"只看 lead/乒乓/下一场(其他体育有内容也不算有内容)
          if (!parsed.lead && !parsed.pingpong.length && !parsed.next) {
            html += '<div class="pending__fallback"><span class="pending__note">' + esc(rawNote) + '</span></div>';
          }
          html += '</div>';
        } else if (data.nextEvent && data.nextEvent.date) {
          // 完全空白天(无比赛无说明)兜底指向下一场——理论上已被 dayHasContent 折叠,这里仅保险
          html += '<div class="day__pending">' +
                    '<span class="pending__badge">📋 待公布</span>' +
                    '<span class="pending__next">下一场：<strong>' + esc(data.nextEvent.date) + '</strong> ' + esc(nextEventCompactNoDate(data.nextEvent, gapMode) || '国乒比赛') + '</span>' +
                  '</div>';
        }
      }

      // 当日底部「今日已重播」归档区:已过时间的重播(已播)放当日下方,不占顶部待看位
      html += renderReplayZone(day.date, ctx.replayGroups[day.date], now, 'past');

      html += '</section>';
      return html;
    }

    // 首屏关键区:横幅 + 未来(upcoming)天。fetch 完成立即渲染,渲染完即移除骨架(用户第一眼就有内容)。
    function buildAbove(ctx, data) {
      var html = '';
      if (ctx.gapMode && ctx.countdownDays !== null) {
        html += '<div class="gap-banner" role="status">' +
                  '<span class="gap-banner__icon" aria-hidden="true">📭</span>' +
                  '<span class="gap-banner__text">离最近一场国乒比赛，还有 <strong>' + ctx.countdownDays + '</strong> 天</span>' +
                '</div>';
      }
      ctx.upcomingContent.forEach(function (x) { html += renderDaySection(x, ctx, data); });
      return html;
    }
    // 下方区块:往期战报 + 下一站卡。首屏下方用「轻量占位条」占位,滚动临近视口 400px 时才挂载真实 DOM。
    function buildBelow(ctx, data) {
      var html = '';
      var pastContent = ctx.pastContent;
      if (pastContent.length) {
        var recapLabel = (pastContent.length === 1 && pastContent[0].diff === -1) ? '昨日战报' : '往期战报';
        html += '<div class="recap-sep"><span>—— ' + recapLabel + ' ——</span></div>';
        pastContent.forEach(function (x) { html += renderDaySection(x, ctx, data); });
      }
      if (data.nextEvent && data.nextEvent.date) {
        var ne = data.nextEvent;
        html += '<section class="day day--next" aria-label="下一站国乒赛事">' +
                  '<div class="day__head">' +
                    '<div class="day__when">' +
                      '<span class="day__date">' + esc(ne.date) + '</span>' +
                      '<span class="day__week">' + esc(ne.weekday || '') + '</span>' +
                    '</div>' +
                    (ctx.gapMode ? '' : '<span class="tag tag--soon">距今天 ' + esc(ne.daysAway) + ' 天</span>') +
                  '</div>' +
                  '<div class="day__next-title">📅 下一站国乒赛事</div>' +
                  renderNextCard(ne) +
                '</section>';
      }
      return html;
    }

    // 整页一次性渲染:缓存瞬显 / 后台刷新覆盖 / 60s 轮询。
    // opts.fromCache = 标「本地缓存,正在刷新」;opts.fromPoll = 保留当前滚动位置。
    function renderFull(data, opts) {
      opts = opts || {};
      var ctx = prepareCtx(data);
      var html = buildAbove(ctx, data) + buildBelow(ctx, data);
      var u = document.getElementById('updatedAt');
      if (opts.fromCache) {
        document.title = data.title + ' · 本地缓存';
        if (u) u.textContent = data.updatedAt + '（本地缓存，正在刷新…）';
      } else {
        document.title = data.title + ' · 每日更新';
        if (u) u.textContent = data.updatedAt;
      }
      var holder = document.getElementById('days');
      var keepY = (opts.fromPoll === true) ? window.scrollY : 0;
      holder.innerHTML = html;
      holder.classList.remove('is-slow');
      if (keepY) window.scrollTo(0, keepY);
      applyFilter(FILTER);
    }

    // 渐进式:首屏先出 above(横幅 + 今天/明天/后天),下方 below(往期战报 + 下一站卡)用「轻量占位条」占位,
    // 滚动临近视口 400px 时才挂载真实 DOM(IntersectionObserver),省首屏构建开销;
    // 若 below 本就在首屏内则立即命中,不退化。
    function renderStaged(data) {
      var ctx = prepareCtx(data);
      document.title = data.title + ' · 每日更新';
      var u = document.getElementById('updatedAt');
      if (u) u.textContent = data.updatedAt;
      var above = buildAbove(ctx, data);
      var below = buildBelow(ctx, data);
      var holder = document.getElementById('days');
      holder.innerHTML = above + '<div class="lazy-placeholder" id="belowPlaceholder" aria-hidden="true"></div>';
      holder.classList.remove('is-slow');
      applyFilter(FILTER);
      mountBelowWhenVisible(holder, below);
    }
    // 滚动临近视口时把 below 的真实 HTML 挂上去(替换占位条),挂完即重跑筛选
    function mountBelowWhenVisible(holder, belowHtml) {
      var ph = holder.querySelector('#belowPlaceholder');
      if (!ph) { holder.insertAdjacentHTML('beforeend', belowHtml); applyFilter(FILTER); return; }
      if (!('IntersectionObserver' in window)) {
        ph.outerHTML = belowHtml; applyFilter(FILTER); return;   // 老浏览器兜底:直接挂载
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            ph.outerHTML = belowHtml;
            applyFilter(FILTER);
            io.disconnect();
          }
        });
      }, { root: null, rootMargin: '0px 0px 400px 0px', threshold: 0 });
      io.observe(ph);
    }
