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
    // 浏览器才跑;Node(node --test)下 document 未定义,整段 no-op
    if (typeof document !== 'undefined') {
      tick();
      setInterval(tick, 1000);
    }

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
    // localStorage 缓存快照:加载成功后存 {ts,data}(含已合并的视频块),复访≤8h 直接瞬显再后台刷新。
    var CACHE_KEY = 'pp_cache_v1';
    // 与刷新链(每 8h 跑一次)对齐:快照有效期 8h,超过则不复访瞬显,等权威数据覆盖
    var CACHE_MAX_AGE = 8 * 3600 * 1000;
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
    // 同上:浏览器才启动,Node 测试环境跳过(避免触发 fetch / DOM 挂载)
    if (typeof document !== 'undefined') {
      boot();   // 启动加载(含缓存瞬显 + 渐进式渲染 + 状态机)
      // 赛中比分每 60s 轮询一次,直播中的比赛分数自动更新(配合刷新链写入的 live 字段)
      setInterval(function () {
        loadData().then(function (d) { renderFull(d, { fromPoll: true }); writeCache(d); }).catch(function () {});
      }, 60000);
    }

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

      // 分类信号(提前定义,分句循环里就要用)
      var noping = /羽毛球|中超|足球|篮球|排球|网球|游泳|田径|跳水|赛车|F1|拳击|摔跤|体操|艺术体操|围棋|象棋|电竞|斯诺克|台球|高尔夫|马拉松|举重|射击|射箭|击剑|皮划艇|赛艇|帆船|自行车|马术|空手道|跆拳道|柔道|冰球|花样滑冰|短道速滑|速滑|冬奥|滑雪|冰壶|蹦床|攀岩|冲浪|棒球|橄榄球|板球|手球|水球|铁人三项/;
      var pp     = /乒乓|WTT|世乒|冠军赛|大满贯|奥运|男单|女单|男双|女双|混双|瑞典|横滨|团体/;

      // 2. 按 。/;/； 分句
      var clauses = s.split(/[。;；]/).map(function (c) { return c.trim(); }).filter(Boolean);

      var items = [];
      var lastChannel = '';

      clauses.forEach(function (clause) {
        // 整句是否讲乒乓:用于上下文分类(如「乒乓仅央视5 12:58 比赛4」中「比赛4」应归为乒乓)
        var isPingContext = pp.test(clause);
        // 单次正则按文档顺序匹配 CCTV 槽或裸时间 → 裸时间才能正确继承最近的 CCTV 频道
        var slots = [];
        // 支持 CCTV-5/CCTV-5+/CCTV-16 与中文写法央视5/央视5+/央视16,并归一化为 CCTV-x
        var re = /(CCTV-\d+\+?|央视\d+\+?)\s+(\d{1,2}:\d{2})|\b(\d{1,2}:\d{2})\b/g;
        var mm;
        while ((mm = re.exec(clause)) !== null) {
          if (mm[1]) {
            var chan = mm[1].replace(/^央视/, 'CCTV-');
            slots.push({ channel: chan, time: mm[2], start: mm.index, endIdx: mm.index + mm[0].length });
            lastChannel = chan;
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
          clauseItems.push({ channel: slots[i].channel, time: slots[i].time, program: desc, _ctx: isPingContext });
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

      // 3. 分类(乒乓 vs 其他体育):先看整句上下文,再看节目描述
      //    关键:不能用「决赛」「录像」「锦标赛」等通用词当乒乓信号——
      //    否则「羽毛球世锦赛1/4决赛 直播」会因含「决赛」/「锦标赛」误判进乒乓节目。
      //    但像「乒乓仅央视5 12:58 比赛4」这种整句讲乒乓的,其下节目(比赛4)应归为乒乓。
      items.forEach(function (it) {
        if (it._ctx) {
          // 整句讲乒乓:节目默认进乒乓,只有明确标出其他运动才进其他
          if (noping.test(it.program)) { out.other.push({ channel: it.channel, time: it.time, program: it.program }); return; }
          out.pingpong.push({ channel: it.channel, time: it.time, program: it.program });
        } else {
          // 整句未提乒乓:只有节目描述里明确出现乒乓信号才进乒乓,否则默认其他
          if (pp.test(it.program)) { out.pingpong.push({ channel: it.channel, time: it.time, program: it.program }); return; }
          out.other.push({ channel: it.channel, time: it.time, program: it.program });
        }
      });
      out.pingpong.sort(function (a, b) { return a.time.localeCompare(b.time); });
      out.other.sort(function (a, b) { return a.time.localeCompare(b.time); });

      // 5. 摘要 = 第一个 CCTV/央视 出现所在的结论句(到下一个句号/分号/破折号为止),
      //    让「空窗期延续。8/27(周四)央视三频道确认无任何乒乓球直播(央视一周录播表核验)」
      //    能完整作为摘要,而不是截断成"8/27(周四"。
      var firstCctv = s.search(/CCTV|央视/);
      if (firstCctv > 0) {
        var leadEnd = s.substring(firstCctv).search(/[。；;]|——/);
        if (leadEnd === -1) leadEnd = s.length - firstCctv;
        out.lead = s.substring(0, firstCctv + leadEnd).trim();
      } else {
        out.lead = s.trim();
      }
      out.lead = out.lead.replace(/[,:;。\s]+$/, '');
      if (/[（(]$/.test(out.lead)) out.lead = out.lead.replace(/[（(]+$/, '');

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
    // 2026-08-28 修:splitOutsideParens 替代 split — 防止「(卫冕冠军/世界第1)」括号内
    // 的 / 被错误拆分;absent split 增加 ; — 处理「梁靖崑(...);韩国队全员...」连写。
    function splitOutsideParens(s, sepChars) {
      var parts = []; var cur = ''; var depth = 0;
      for (var i = 0; i < s.length; i++) {
        var ch = s[i];
        if (ch === '(' || ch === '（') depth++;
        else if (ch === ')' || ch === '）') { if (depth > 0) depth--; }
        else if (depth === 0 && sepChars.indexOf(ch) >= 0) {
          if (cur.trim()) parts.push(cur.trim());
          cur = '';
          continue;
        }
        cur += ch;
      }
      if (cur.trim()) parts.push(cur.trim());
      return parts;
    }

    // 在括号外(深度 0)找第一个匹配,返回 {word, index};全部在括号内则返回 null。
    // 用途:抽「头号种子」时必须跳过阵容 rankLabel —— 真实数据
    // 「王楚钦(头号种子·卫冕冠军·世界第1 8857分)」的种子词在括号内,是选手标签不是种子句;
    // 真正的种子句「女单头号种子为日本张本美和(6289分)」在括号外(2026-08-29 踩坑)。
    function matchOutsideParens(s, re) {
      var reG = new RegExp(re.source, 'g');
      var m;
      while ((m = reG.exec(s)) !== null) {
        var d = 0;
        for (var i = 0; i < m.index; i++) {
          var c = s.charAt(i);
          if (c === '(' || c === '（') d++;
          else if ((c === ')' || c === '）') && d > 0) d--;
        }
        if (d === 0) return { word: m[0], index: m.index };
      }
      return null;
    }

    // 「赛事信息」要点里的排行榜(「label: 甲 分 / 乙 分 / …」)——
    // 10 个人名+分数糊成一条 126 字巨行,适老化必须拆开。仅在「>=4 段且每段都含数字」时判定,
    // 避免普通含「/」的要点(如「男双法国勒布伦兄弟」)被误拆。
    function maybeRankList(p) {
      var ci = p.search(/[:：]/);
      if (ci < 0) return null;
      var label = p.slice(0, ci).trim();
      if (!label) return null;
      var rest = p.slice(ci + 1).trim();
      var segs = rest.split(' / ').map(function (x) { return x.trim(); }).filter(Boolean);
      if (segs.length < 4) return null;
      if (!segs.every(function (s) { return /\d/.test(s); })) return null;
      return { label: label, segs: segs };
    }

    // schedule / tv 段渲染:含 → 走时间线(有序),否则按 ；(括号外)拆多行列表。
    // 这是 2026-08-31 线上复盘的根因修复 —— 采集端现在把赛程/直播写成「；」分隔的描述段,
    // 旧逻辑只在含 → 时才拆,否则整段 695 字一个 esc() 段落 = 适老化大坨。
    function renderScheduleOrTvHtml(b) {
      var text = b.text || '';
      if (text.indexOf('→') >= 0) {
        var steps = text.split('→').map(function (x) { return x.trim(); }).filter(Boolean);
        var h = '<ol class="next__timeline">';
        steps.forEach(function (st) { h += '<li>' + esc(st) + '</li>'; });
        return h + '</ol>';
      }
      var lines = splitOutsideParens(text, '；;')
        .map(function (x) { return x.trim(); })
        .filter(Boolean);
      if (lines.length > 1) {
        var h2 = '<ul class="next__lines">';
        lines.forEach(function (ln) { h2 += '<li>' + esc(ln) + '</li>'; });
        return h2 + '</ul>';
      }
      return '<div class="next__body">' + esc(text) + '</div>';
    }

    function parseNextRoster(nextLine) {
      var squad = [], absent = [];
      if (!nextLine) return { squad: squad, absent: absent };

      // 出战段:兼容多种前缀 — 出战: / 国乒\d*人: / 报名: / 参赛: / 阵容:
      // 真实生产数据用「国乒10人:男单...」而非「出战:」,原 regex 仅认「出战」长期失效。
      // lookahead 强制前面要有 [,;。]+空白,避免「(备战亚运)」括号内「亚运」误命中。
      var sm = nextLine.match(/(?:出战|国乒\d*人|报名|参赛|阵容)[:：]([\s\S]*?)(?=[,;。]\s*(?:缺席|退赛|不出战|直播渠道|赛程|赛后|最近战报|头号种子|亚运名单|背景)|$)/);
      if (sm) {
        var sPart = sm[1].replace(/[。;；,，]+$/, '').trim();
        var curGender = ''; // 继承用:男/女
        // 括号外的 / 、 , , 才劈(避坑「王楚钦(卫冕冠军/世界第1)」括号内的 /)
        splitOutsideParens(sPart, '/、,，').forEach(function (raw) {
          var name = raw.trim();
          if (!name) return;
          var g = name.match(/^(男单|男双|男团|女单|女双|女团|混双)/);
          var gender = curGender;
          if (g) {
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

      // 缺席段:兼容 缺席: / 退赛: / 不出战:。lookahead 必须前面有 [,;。] 标点 + 空白,
      // 防止「(轮休备战亚运)」括号内「亚运」误命中,导致 absent 段被截到第一个括号内。
      var am = nextLine.match(/(?:缺席|退赛|不出战)[:：]([\s\S]*?)(?=[,;。]\s*(?:出战|国乒|报名|参赛|直播渠道|赛程|赛后|最近战报|头号种子|亚运名单|背景)|$)/);
      if (am) {
        splitOutsideParens(am[1].replace(/[。;；,，]+$/, '').trim(), '、,，;；').forEach(function (raw) {
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

    // 「下一站国乒赛事」卡片里 nextEvent.note 也是一坨长文本,这里按语义拆成结构化块。
    // 2026-08-28 升级:在原 macro 6 类(meta/squad/seeds/schedule/tv/sources)基础上,
    // 复用既有 parseNextRoster 把「出战/缺席」拆成结构化数组(分男女),并正则抽「头号种子」。
    // 解析失败走原文 fallback(roster=null → renderNextCard 走旧 blocks 路径)。
    function parseNextEventNote(note) {
      var out = { meta: '', squad: '', seeds: '', schedule: '', tv: '', sources: '', roster: null, headSeed: null };
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

      // 只保留当前 nextEvent(即将来临的这场)信息;遇到「其后一站」等后续赛事标记即截断,
      // 避免后续站(如阿斯塔纳)的退赛/名单变动误混入当前站卡(造成"陈幸同退了本场却还在名单"的误读)
      var stop = false;
      clauses.slice(1).forEach(function (cl) {
        if (stop) return;
        if (/其后一站|下一站为\s*WTT/.test(cl)) { stop = true; return; }
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

      // 复用既有 parseNextRoster 把「出战/缺席」拆成结构化数组(分男女)。
      // 直接传整 note 字符串 s,parseNextRoster 自身 regex 找「出战:」前缀。
      // 注意:rankLabel 保留(「6号种子」「卫冕冠军」「WTT 提名」),gender 字段
      // 标记 男/女/未识别, renderNextCard 按性别拆双列。失败兜底 roster=null。
      try {
        out.roster = parseNextRoster(s);
        if (!out.roster) out.roster = null;
      } catch (e) { out.roster = null; }

      // 抽头号种子 / 卫冕冠军(国籍 + 姓名 + 年龄)。句式:
      //   「女单头号种子为日本张本美和(18岁)」 → name=日本张本美和, age=18岁(渲染剥国籍、配国旗)
      //   「卫冕冠军孙颖莎」                   → name=孙颖莎,      age=''
      //   「卫冕冠军·女单1号种子」(无真实姓名) → name='' → 渲染「待官方公布」
      // 关键改动(2026-08-29,子上反馈「头号种子又看不到了」):
      //   ① 种子词扩展:头号种子 / 一号种子 / 1号种子 / 卫冕冠军 / 卫冕女单 / 卫冕男单 / 卫冕
      //   ② 只在种子词**之后**的窗口找姓名(旧版把种子词本身也捕进来了)
      //   ③ 跳过「冠军/种子/女单/号种子…」等分类停用词,避免把分类词当人名
      //   ④ 窗口截到第一个句读(。;；),防止把下一句里的「日本队」「主力」误当种子
      try {
        var hs = null;
        // 只认括号外的种子词(matchOutsideParens):阵容 rankLabel
        // 「王楚钦(头号种子·卫冕冠军·世界第1 8857分)」在括号内,是选手标签不是种子句。
        // 优先级:头号种子/一号种子/1号种子 > 卫冕冠军/卫冕女单/卫冕男单/卫冕。
        var seedWord = matchOutsideParens(s, /(头号种子|一号种子|1\s*号种子)/) ||
                       matchOutsideParens(s, /(卫冕冠军|卫冕女单|卫冕男单|卫冕)/);
        if (seedWord) {
          var seg = s.slice(seedWord.index + seedWord.word.length);
          var segEnd = seg.search(/[。;；]/);
          if (segEnd > -1) seg = seg.slice(0, segEnd);
          if (seg.length > 30) seg = seg.slice(0, 30);
          // 分类停用词(含子串匹配):这些是标签不是人名
          var STOP_RE = /冠军|种子|单打|双打|混双|男单|女单|男双|女双|团体|选手|队|头号|一号|1号|卫冕|决赛|号|世界|排名|积分|分/;
          var NAT = '(?:日本|韩国|中国|瑞典|德国|法国|美国|朝鲜|新加坡)';
          // ① 优先:姓名 + (年龄/积分) —— 括号里是数字即认作选手属性,最可靠
          //    「日本张本美和(18岁)」→ age=18岁;「日本张本美和(6289分)」→ rank=6289分
          var withNum = seg.match(new RegExp('(' + NAT + '?[一-龥]{2,4})[（\\(](\\d+\\s*(?:岁|分|积分))[）\\)]'));
          if (withNum) {
            var nv = withNum[2];
            var isAge = /岁/.test(nv);
            hs = { label: seg.slice(0, withNum.index + withNum[0].length),
                   name: withNum[1], age: isAge ? nv : '', rank: isAge ? '' : nv };
          } else {
            // ② 无括号数字:取种子词后第一段**连续中文**,剥连接词 + 国籍后判 2-4 字人名。
            //    用连续中文段(而非 [一-龥]{2,4} 逐个扫)避免贪婪把「为日本张本美和」截成「为日本张」。
            var segCn = (seg.match(/[一-龥]+/) || [''])[0];
            var rest = segCn.replace(/^(?:为|是|有|之|由|的|·|\s)+/, '');
            var nmM = rest.match(new RegExp('^(' + NAT + ')'));
            var nat = nmM ? nmM[1] : '';
            var nmOnly = nat ? rest.slice(nat.length) : rest;
            var found = '';
            if (nmOnly.length >= 2 && nmOnly.length <= 4 && !STOP_RE.test(nmOnly)) found = nat + nmOnly;
            hs = { label: seg, name: found, age: '', rank: '' };
          }
        }
        out.headSeed = hs;
      } catch (e) { out.headSeed = null; }

      return out;
    }

    // 「赛事信息」段(p.meta)拆成结构化块 —— 适老化铁律「不要大段文字」。
    // 原文形如:
    //   WTT澳门冠军赛2026(中国澳门·东亚运动会体育馆,9/8-9/13,单打1000积分+80万美元总奖金,仅设男女单打各32人正赛)。
    //   日本队全主力(张本智和/松岛辉空/张本美和/早田希娜)压境, 韩国队全员弃赛。男双/女双各2对教练组推荐。...
    // 拆为 title(赛事名) + facts[](括号内地点/日期/奖金/赛制,带图标) + points[](括号后逐条要点)。
    // 关键:points 用 splitOutsideParens 按 。/;/； 切,括号内的「/」(如选手名单)不会被误劈。
    // 解析失败(ok=false)调用方回退 esc 原文,绝不丢内容。
    function parseEventMeta(meta) {
      var out = { title: '', facts: [], points: [], ok: false, raw: meta || '' };
      var s = String(meta || '').trim();
      if (!s) return out;

      // 1. title = 第一个左括号之前(赛事名);无括号则取首句
      var parenIdx = s.search(/[（(]/);
      if (parenIdx > 0) out.title = s.slice(0, parenIdx).trim();
      else {
        var dotIdx = s.search(/[。;；]/);
        out.title = (dotIdx > 0 ? s.slice(0, dotIdx) : s).trim();
      }

      // 2. facts = 第一个括号内的 key facts,按 ,/、 拆后按关键词归类(地点/日期/奖金/赛制)
      var pm = s.match(/[（(]([^)）]*)[)）]/);
      if (pm) {
        splitOutsideParens(pm[1], ',，、').forEach(function (raw) {
          var v = raw.trim();
          if (!v) return;
          if (/馆|中心|体育场|球场|地点/.test(v))      out.facts.push({ icon: '📍', value: v });
          else if (/\d+\s*\/\s*\d+|\d+\s*月|月\s*\d+/.test(v)) out.facts.push({ icon: '📅', value: v });
          else if (/元|奖金|积分|美元/.test(v))        out.facts.push({ icon: '💰', value: v });
          else                                          out.facts.push({ icon: '🎯', value: v });
        });
      }

      // 3. points = 括号之后的剩余内容,按 。/;/； 拆成逐条要点(每条独立一行,一眼扫完)
      var after = '';
      if (pm) after = s.slice(pm.index + pm[0].length).trim();
      else if (parenIdx > 0) after = s.slice(parenIdx).trim();
      else after = s;
      after = after.replace(/^[，,。;；\s]+/, '').trim();
      if (after) {
        // 逗号也拆(括号外):「日本队全主力(...)压境, 韩国队全员弃赛」应成两条独立要点,
        // 而不是糊成一行。括号内「/」(选手名单)仍受 splitOutsideParens 保护不被劈开。
        splitOutsideParens(after, '。;；,，').forEach(function (raw) {
          var v = raw.trim().replace(/^[，,、\s]+/, '').replace(/[，,、\s]+$/, '').trim();
          if (v) out.points.push(v);
        });
      }

      out.ok = !!(out.title || out.facts.length || out.points.length);
      return out;
    }

    // 单条「赛事信息」要点的渲染:排行榜(甲 分 / 乙 分)拆 2 列子列表,否则普通要点。
    function renderEmetaPointHtml(p) {
      var rank = maybeRankList(p);
      if (rank) {
        var h = '<li class="emeta__point emeta__point--rank">' +
                '<span class="emeta__rank-label">' + esc(rank.label) + '</span>' +
                '<ul class="emeta__rank">';
        rank.segs.forEach(function (sg) {
          h += '<li class="emeta__rank-item">' + esc(sg) + '</li>';
        });
        h += '</ul></li>';
        return h;
      }
      // 含「队」的要点(日本队/韩国队等对手动态)加红边强调,一眼区分于赛制补充
      var isTeam = /队/.test(p);
      return '<li class="emeta__point' + (isTeam ? ' emeta__point--team' : '') + '">' + esc(p) + '</li>';
    }

    // 把 parseEventMeta 结果渲染成 title + facts 行 + points 列表;ok=false 返回空(调用方回退原文)
    function renderEventMetaHtml(parsed) {
      if (!parsed || !parsed.ok) return '';
      var h = '';
      if (parsed.title) h += '<div class="emeta__title">' + esc(parsed.title) + '</div>';
      if (parsed.facts.length) {
        h += '<ul class="emeta__facts">';
        parsed.facts.forEach(function (f) {
          h += '<li class="emeta__fact">' +
                 '<span class="emeta__icon">' + f.icon + '</span>' +
                 '<span class="emeta__val">' + esc(f.value) + '</span>' +
               '</li>';
        });
        h += '</ul>';
      }
      if (parsed.points.length) {
        h += '<ul class="emeta__points">';
        parsed.points.forEach(function (p) {
          h += renderEmetaPointHtml(p);
        });
        h += '</ul>';
      }
      return h;
    }

    // 把解析结果渲染成清晰分块(适老化:大字号、左对齐、分节标题)。
    // 2026-08-28 升级:roster 可用时,出战名按男女拆两列卡,缺席按名单拆 3 张小卡,
    // 头号种子抽单条 callout,大幅消除长文本;roster 缺失走原文 blocks 路径兜底。
    function renderNextCard(ne) {
      var p = parseNextEventNote(ne.note || '');

      // 新路径:roster 有内容时走卡组化布局
      if (p.roster && (p.roster.squad.length || p.roster.absent.length)) {
        var html2 = '<div class="day__next day__next--structured day__next--chip">';

        if (p.meta) {
          // 赛事信息大段 → 拆 title + facts(📍📅💰🎯) + points 要点列表;失败回退原文
          var em = parseEventMeta(p.meta);
          var metaBody = em.ok ? renderEventMetaHtml(em) : esc(p.meta);
          html2 += '<div class="next__block next__block--hero">' +
                   '<div class="next__head">赛事信息</div>' +
                   '<div class="next__body">' + metaBody + '</div>' +
                   '</div>';
        }

        // 出战名单:男左女右两列卡
        if (p.roster.squad.length) {
          var males = p.roster.squad.filter(function (s) { return s.gender === '男'; });
          var females = p.roster.squad.filter(function (s) { return s.gender === '女'; });
          var others = p.roster.squad.filter(function (s) { return !s.gender; });
          html2 += '<div class="next__block">' +
                   '<div class="next__head">出战名单</div>' +
                   '<div class="squad-grid">';
          if (males.length) {
            html2 += '<div class="squad-card squad-card--male">' +
                     '<div class="squad-card__h">男单 · ' + males.length + ' 人</div>' +
                     '<div class="squad-card__list">';
            males.forEach(function (m) {
              html2 += '<div class="squad-name">' + esc(m.name) +
                       (m.rankLabel ? '<span class="squad-rank">' + esc(m.rankLabel) + '</span>' : '') +
                       '</div>';
            });
            html2 += '</div></div>';
          }
          if (females.length) {
            html2 += '<div class="squad-card squad-card--female">' +
                     '<div class="squad-card__h">女单 · ' + females.length + ' 人</div>' +
                     '<div class="squad-card__list">';
            females.forEach(function (f) {
              html2 += '<div class="squad-name">' + esc(f.name) +
                       (f.rankLabel ? '<span class="squad-rank">' + esc(f.rankLabel) + '</span>' : '') +
                       '</div>';
            });
            html2 += '</div></div>';
          }
          if (others.length && !males.length && !females.length) {
            html2 += '<div class="squad-card squad-card--neutral">' +
                     '<div class="squad-card__h">出战 · ' + others.length + ' 人</div>' +
                     '<div class="squad-card__list">';
            others.forEach(function (o) {
              html2 += '<div class="squad-name">' + esc(o.name) +
                       (o.rankLabel ? '<span class="squad-rank">' + esc(o.rankLabel) + '</span>' : '') +
                       '</div>';
            });
            html2 += '</div></div>';
          }
          html2 += '</div></div>';
        }

        // 缺席:一张张小卡,姓名 + 原因(轮休/备战/...)
        if (p.roster.absent.length) {
          html2 += '<div class="next__block">' +
                   '<div class="next__head">缺席 · ' + p.roster.absent.length + ' 人</div>' +
                   '<div class="absent-list">';
          p.roster.absent.forEach(function (a) {
            html2 += '<div class="absent-card">' +
                     '<span class="absent-card__name">' + esc(a.name) + '</span>' +
                     (a.reason ? '<span class="absent-card__reason">' + esc(a.reason) + '</span>' : '') +
                     '</div>';
          });
          html2 += '</div></div>';
        }

        // 头号种子:单条 callout,抓眼琥珀底(字号加大,见 .next__callout)。
        // 只有分类词(「卫冕冠军·女单1号种子」)而无真实姓名时显示「待官方公布」——
        // 子上 2026-08-29 反馈「头号种子又看不到了」:空泛标签 = 老人不知道看谁。
        if (p.headSeed) {
          var hsName = p.headSeed.name || '';
          var hsFlag = '';
          var natM = hsName.match(/^(日本|韩国|中国|瑞典|德国|法国|美国|朝鲜|新加坡)/);
          if (natM) {
            hsFlag = FLAGS[natM[1]] || '';
            hsName = hsName.slice(natM[0].length);
          }
          html2 += '<div class="next__block">' +
                   '<div class="next__head">头号种子</div>' +
                   '<div class="next__callout">' +
                   (hsName
                     ? '<strong>' + (hsFlag ? hsFlag + ' ' : '') + esc(hsName) + '</strong>'
                     : '<strong class="next__callout--tbd">待官方公布</strong>') +
                   (p.headSeed.age ? ' <span class="next__callout-meta">(' + esc(p.headSeed.age) + ')</span>' : '') +
                   (p.headSeed.rank ? ' <span class="next__callout-meta">' + esc(p.headSeed.rank) + '</span>' : '') +
                   '</div></div>';
        }

        // 时间线 / 直播 / 来源保留(原 schedule/tv/sources)
        var tailBlocks = [];
        if (p.schedule) tailBlocks.push({ key: 'schedule', label: '赛程时间线', text: p.schedule });
        if (p.tv)       tailBlocks.push({ key: 'tv',       label: '直播安排',   text: p.tv });
        if (p.sources)  tailBlocks.push({ key: 'sources',  label: '信息来源',   text: p.sources });
        tailBlocks.forEach(function (b) {
          html2 += '<div class="next__block">';
          html2 += '<div class="next__head">' + b.label + '</div>';
          if (b.key === 'schedule' || b.key === 'tv') {
            html2 += renderScheduleOrTvHtml(b);
          } else {
            html2 += '<div class="next__body">' + esc(b.text) + '</div>';
          }
          html2 += '</div>';
        });

        html2 += '</div>';
        return html2;
      }

      // 旧路径:roster 缺失,走原 blocks 渲染(向后兼容)
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
        if (b.key === 'schedule' || b.key === 'tv') {
          html += renderScheduleOrTvHtml(b);
        } else if (b.key === 'meta') {
          // 赛事信息大段 → 拆 title + facts + points;失败回退原文
          var em2 = parseEventMeta(b.text);
          html += '<div class="next__body">' + (em2.ok ? renderEventMetaHtml(em2) : esc(b.text)) + '</div>';
        } else {
          html += '<div class="next__body">' + esc(b.text) + '</div>';
        }
        html += '</div>';
      });

      // 头号种子 callout:旧路径(no roster)同样要显示,否则种子信息整块消失
      if (p.headSeed) {
        var hsName2 = p.headSeed.name || '';
        var hsFlag2 = '';
        var natM2 = hsName2.match(/^(日本|韩国|中国|瑞典|德国|法国|美国|朝鲜|新加坡)/);
        if (natM2) {
          hsFlag2 = FLAGS[natM2[1]] || '';
          hsName2 = hsName2.slice(natM2[0].length);
        }
        html += '<div class="next__block">' +
                  '<div class="next__head">头号种子</div>' +
                  '<div class="next__callout">' +
                  (hsName2
                    ? '<strong>' + (hsFlag2 ? hsFlag2 + ' ' : '') + esc(hsName2) + '</strong>'
                    : '<strong class="next__callout--tbd">待官方公布</strong>') +
                  (p.headSeed.age ? ' <span class="next__callout-meta">(' + esc(p.headSeed.age) + ')</span>' : '') +
                  (p.headSeed.rank ? ' <span class="next__callout-meta">' + esc(p.headSeed.rank) + '</span>' : '') +
                  '</div></div>';
      }

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
        var hasNext = sec.querySelector('.day__next');   // 下一站卡:无比赛/无说明,不可被国籍筛选隐藏
        sec.style.display = (anyVisible || hasStatic || hasNext) ? '' : 'none';
        // 某天筛选后无可见重播,则隐藏对应重播区(upcoming/past 两个区分别处理,不留空标题)
        sec.querySelectorAll('.day__replays').forEach(function (rep) {
          var anyRep = false;
          rep.querySelectorAll('.replay__item').forEach(function (r) { if (r.style.display !== 'none') anyRep = true; });
          rep.style.display = anyRep ? '' : 'none';
        });
      });
    }
    // 同上:Node 下跳过事件绑定(没有 #filter 元素,直接绑定会 TypeError)
    if (typeof document !== 'undefined') {
      document.getElementById('filter').addEventListener('click', function (e) {
        var btn = e.target.closest('.filter__btn');
        if (!btn) return;
        document.querySelectorAll('.filter__btn').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        applyFilter(btn.dataset.scope);
        // 切换 tab 时回到页面最顶上,避免停在原滚动位置
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
    }

    // 视频块单场 note 解析:把 ~200 字长文拆成 lead(对阵位置) + chips(5盘3胜/对位/影院) + 渠道提示 + 后续预告。
    // 解析失败兜底:返回单 chips 字段缺失的对象,renderMatchNoteHtml 看空就走原文 esc,不破不立。
    // 解析模式设计原则:对采集端而言输入仍是一坨 note 长文本,**契约零改动**;
    // 对外婆 UI 而言:红 risk chip「电视看不到」由 .day__video-warn 顶置,这里只补块内局部 chip。
    function parseMatchNote(note) {
      var out = { lead: '', chips: [], platformHint: '', followUp: '' };
      if (!note) return out;
      var s = String(note).trim();
      if (!s) return out;

      // 1. lead:「中国选手 X 代表 Y 出战,日本选手 Z 代表 W 在阵」一句(直到首个 ,。;。)
      var leadM = s.match(/^[\s\S]*?(?:出战|在阵|参赛)[,，]?\s*/);
      if (leadM) {
        var tail = leadM[0];
        // 截到下个标点
        var cut = tail.search(/[,，;；。]/);
        if (cut > 0) tail = tail.slice(0, cut);
        out.lead = tail.replace(/[,，;。]+$/, '').trim();
      }
      // 兜底:lead 过长就截前 60 字
      if (out.lead.length > 70) out.lead = out.lead.slice(0, 70).replace(/[,，;。]+$/, '').trim();

      // 2. chips 集合:5盘3胜 / 未必直接对位 / 影院同步+票价 / 电视不转播
      function pushChip(key, label, tone) {
        if (label && !out.chips.find(function (c) { return c.key === key; })) {
          out.chips.push({ key: key, label: label, tone: tone || 'gray' });
        }
      }
      if (/5\s*盘\s*3\s*胜/.test(s)) pushChip('T5', '5盘3胜', 'red');
      if (/(未必|不\s*[一]?定)\s*(直接|一定)?\s*对位|未必.*对位/.test(s)) pushChip('NOPP', '未必直接对位', 'gray');
      var cinemaM = s.match(/影院[^\.;。]*?(?:直播|大屏)[^\.;。]{0,30}?/);
      if (cinemaM) {
        var cl = '影院同步';
        var priceM = s.match(/(\d+\s*[-~]\s*\d+\s*元|票价[^\.;。]*?\d+\s*元)/);
        if (priceM) cl += ' ' + priceM[0].replace(/票价/, '').trim();
        pushChip('CINEMA', cl, 'amber');
      }
      if (/(?:电视|央视)[^\.;。]*?(?:不\s*转播|看不到|不\s*播)/.test(s)) pushChip('CCTV_NO', '电视不转播', 'red');

      // 3. platformHint:「手机/平板/电脑打开 XX」一句
      var platM = s.match(/(手机\/平板\/电脑[^\.;。]*)/);
      if (platM) {
        out.platformHint = platM[1].replace(/[,，;。]+$/, '').trim();
      }

      // 4. followUp:「若 ... 」收尾一段(简短),最长 50 字
      var fuM = s.match(/(若[\s\S]{0,80}?(?:直[播]|直播|优酷)[^\.;。]*?)(?:[。;；,]|$)/);
      if (fuM) {
        out.followUp = fuM[1].trim();
        if (out.followUp.length > 60) {
          out.followUp = out.followUp.slice(0, 60).replace(/[,，;。]+$/, '') + '…';
        }
      }

      return out;
    }

    // 把 parseMatchNote 结果渲染为 chip + 卡片化 HTML
    function renderMatchNoteHtml(parsed) {
      if (!parsed) return '';
      var html = '';
      // chips
      if (parsed.chips && parsed.chips.length) {
        html += '<div class="vmatch__chips">';
        parsed.chips.forEach(function (c) {
          html += '<span class="vchip vchip--' + c.tone + '">' + esc(c.label) + '</span>';
        });
        html += '</div>';
      }
      // lead(简短 1-2 行)
      if (parsed.lead) {
        html += '<div class="vmatch__lead">' + esc(parsed.lead) + '</div>';
      }
      // platformHint(独立行,再次强调用手机/平板/电脑打开)
      if (parsed.platformHint) {
        html += '<div class="vmatch__hint">' + esc(parsed.platformHint) + '</div>';
      }
      // followUp(若晋级/若胜/若进一步 — 单行琥珀 callout)
      if (parsed.followUp) {
        html += '<div class="vmatch__follow"><span class="vchip vchip--amber">后续</span><span class="vmatch__follow-text">' + esc(parsed.followUp) + '</span></div>';
      }
      return html;
    }

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
        var noteParsed = parseMatchNote(m.note);
        var noteHtml = renderMatchNoteHtml(noteParsed);
        // 解析失败(完全无 chips/lead/hint/follow)时回退原文,绝不丢信息
        if (!noteHtml && m.note) {
          noteHtml = '<div class="vmatch__note">' + esc(m.note) + '</div>';
        }
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
          noteHtml +
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

    // 录像/典藏节目长文本(200+ 字赛事回顾)拆结构 —— 适老化铁律「不要大段文字」。
    // 输入如「德国杯1/8决赛,樊振东代表的德国杜塞尔多夫客场1-3不敌卫冕冠军奥克森豪森,止步16强(...):
    //         第一盘卡尔伯格0-3户上隼辅(8-11/8-11/6-11),第二盘...,决胜局...——这是户上隼辅职业生涯第一次赢樊振东」
    // 拆成 headline(赛事名/阶段) + result(关键结果) + boards[](逐盘比分) + decider(决胜) + highlight(故事句)。
    // 解析门槛:长度 ≥50 且含「第X盘」可拆结构;否则 ok=false,调用方回退原文 esc,绝不丢内容。
    function parseRecapProgram(program) {
      var out = { headline: '', result: '', boards: [], decider: '', highlight: '', ok: false, raw: program || '' };
      var s = String(program || '').trim();
      if (!s) return out;
      if (s.length < 50 || !/第[一二三四五六七八九十\d]+盘/.test(s)) return out;

      // 1. headline = 开头到第一个逗号(赛事名 + 阶段),如「德国杯1/8决赛」
      var firstComma = s.search(/[,，]/);
      if (firstComma > 0) out.headline = s.slice(0, firstComma).trim();

      // 2. rest = 逐盘段落起点之后的内容;result = 该起点之前(去掉赛制注记括号)
      var rest = firstComma > 0 ? s.slice(firstComma + 1) : s;
      var boardIdx = rest.search(/第[一二三四五六七八九十\d]+盘/);
      if (boardIdx < 0) return out;
      var pre = rest.slice(0, boardIdx).trim();
      var colonIdx = pre.search(/[：:]/);
      if (colonIdx > -1) pre = pre.slice(0, colonIdx);
      pre = pre.replace(/[（(][^)）]*[)）]\s*$/, '').trim();  // 去尾部赛制注记「(单场淘汰,输一场就回家)」
      out.result = pre.replace(/[,，;；。]+$/, '').trim();

      // 3. boards:逐盘「第X盘 选手A 比分 选手B (局分)」
      //    mm[4] 用 [^,，（(]* 贪婪吃到左括号前,避免可选局分组让非贪婪捕获成空。
      var re = /第([一二三四五六七八九十\d]+)盘\s*([^,，]*?)(\d+\s*-\s*\d+)\s*([^,，（(]*)(?:[（(]([^)）]*)[)）])?/g;
      var mm, lastEnd = 0;
      while ((mm = re.exec(rest)) !== null) {
        var players = ((mm[2] || '').trim() + ' ' + (mm[3] || '').trim() + ' ' + (mm[4] || '').trim()).trim();
        out.boards.push({
          order: '第' + mm[1] + '盘',
          players: players,
          score: (mm[3] || '').trim(),
          sets: (mm[5] || '').trim()
        });
        lastEnd = re.lastIndex;
      }
      if (!out.boards.length) return out;

      // 4. 收尾:最后一个 board 之后的残留文本。有破折号则前半为「决胜」、后半为「故事句」。
      var tail = lastEnd > 0 ? rest.slice(lastEnd) : '';
      tail = tail.replace(/^[,，;；\s]+/, '').trim();
      if (tail) {
        var dashIdx = tail.search(/——|--/);
        if (dashIdx > -1) {
          out.decider = tail.slice(0, dashIdx).replace(/[,，;；\s]+$/, '').trim();
          out.highlight = tail.slice(dashIdx).replace(/^[-—]+/, '').trim();
        } else {
          out.decider = tail.replace(/[,，;；\s]+$/, '').trim();
        }
        if (out.highlight.length > 70) out.highlight = out.highlight.slice(0, 70) + '…';
        if (out.decider.length > 60) out.decider = out.decider.slice(0, 60) + '…';
      }

      out.ok = true;
      return out;
    }

    // 把 parseRecapProgram 结果渲染成分层 HTML;ok=false 时返回空(调用方回退原文)
    function renderRecapHtml(parsed) {
      if (!parsed || !parsed.ok) return '';
      var h = '';
      if (parsed.headline) h += '<div class="prog__headline">' + esc(parsed.headline) + '</div>';
      if (parsed.result)   h += '<div class="prog__result">' + esc(parsed.result) + '</div>';
      if (parsed.boards.length) {
        h += '<ul class="prog__boards">';
        parsed.boards.forEach(function (b) {
          h += '<li class="prog__board">' +
                 '<span class="prog__board-order">' + esc(b.order) + '</span>' +
                 '<span class="prog__board-players">' + esc(b.players) + '</span>' +
                 (b.sets ? '<span class="prog__board-sets">' + esc(b.sets) + '</span>' : '') +
               '</li>';
        });
        h += '</ul>';
      }
      if (parsed.decider)   h += '<div class="prog__decider">' + esc(parsed.decider) + '</div>';
      if (parsed.highlight) h += '<div class="prog__highlight">' + esc(parsed.highlight) + '</div>';
      return h;
    }

    // 空窗期长文本条目列表(原 render 内 renderItemList,抽成纯函数返回字符串)
    function renderItemListHtml(sectionCls, headLabel, list) {
      if (!list.length) return '';
      var h = '<div class="pending__section ' + sectionCls + '">' +
                '<div class="pending__section-head">' + esc(headLabel) + '</div>' +
                '<ul class="pending__list">';
      list.forEach(function (it) {
        // 长文赛事回顾(含「第X盘」)走结构化三层;短节目名保持原样单行
        var rp = parseRecapProgram(it.program);
        var progHtml = rp.ok ? renderRecapHtml(rp)
                             : '<div class="prog__text">' + esc(it.program) + '</div>';
        h += '<li class="pending__row">' +
               '<div class="pending__meta">' +
                 '<span class="pending__time">' + esc(it.time) + '</span>' +
                 '<span class="pending__chan">' + esc(it.channel || 'CCTV') + '</span>' +
               '</div>' +
               '<div class="pending__prog">' + progHtml + '</div>' +
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

    // ---- 测试支持 --------------------------------------------------------
    // Node(node --test)下导出纯逻辑与渲染构建层函数,供 tests/ 直接 require。
    // 浏览器里 `module` 未定义 → 整段跳过,对线上零影响(部署产物行为完全不变)。
    // 配合上方 3 处 `typeof document !== 'undefined'` 守卫,app.js 才能在 Node 里被 require
    // 而不触发 DOM 操作。新增函数后记得同步补进这个清单。
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = {
        // 铁律判定
        belongsToCN: belongsToCN,
        isCCTVChannel: isCCTVChannel,
        riskSaysNoTV: riskSaysNoTV,
        isTVMatch: isTVMatch,
        isTVReplay: isTVReplay,
        dayHasContent: dayHasContent,
        isReplayPassed: isReplayPassed,
        isLiveMatch: isLiveMatch,
        replayTargetDate: replayTargetDate,
        mergeVideo: mergeVideo,
        // 国旗
        flagFor: flagFor,
        flagsForSide: flagsForSide,
        crossFlagsForPair: crossFlagsForPair,
        FLAGS: FLAGS,
        // 长文本解析(2026-08-28 / 08-29 两轮层次化)
        parseNoteToItems: parseNoteToItems,
        parseNextEventNote: parseNextEventNote,
        parseNextRoster: parseNextRoster,
        parseMatchNote: parseMatchNote,
        renderMatchNoteHtml: renderMatchNoteHtml,
        parseRecapProgram: parseRecapProgram,
        renderRecapHtml: renderRecapHtml,
        parseEventMeta: parseEventMeta,
        renderEventMetaHtml: renderEventMetaHtml,
        maybeRankList: maybeRankList,
        renderEmetaPointHtml: renderEmetaPointHtml,
        renderScheduleOrTvHtml: renderScheduleOrTvHtml,
        splitOutsideParens: splitOutsideParens,
        matchOutsideParens: matchOutsideParens,
        // 渲染构建层
        renderReplayZone: renderReplayZone,
        renderResult: renderResult,
        renderLive: renderLive,
        renderRisk: renderRisk,
        renderStatCards: renderStatCards,
        renderScheduleContent: renderScheduleContent,
        renderNextCard: renderNextCard,
        renderVideoBlock: renderVideoBlock,
        renderItemListHtml: renderItemListHtml,
        renderDaySection: renderDaySection,
        prepareCtx: prepareCtx,
        buildAbove: buildAbove,
        buildBelow: buildBelow,
        // 工具
        esc: esc,
        ordinalizeInfo: ordinalizeInfo,
        addDays: addDays,
        parseDt: parseDt
      };
    }
