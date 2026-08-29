'use strict';
/**
 * 测试脚手架
 *
 * app.js 末尾有 `if (typeof module !== 'undefined' && module.exports)` 导出段,
 * 且 3 处顶层执行(tick 定时器 / boot 启动 / filter 事件绑定)都加了
 * `typeof document !== 'undefined'` 守卫,所以 Node 里可以**直接 require**。
 *
 * 两段在浏览器里都是 no-op(module 未定义 → 跳过导出;document 存在 → 正常执行),
 * 因此部署产物行为与加守卫前完全一致。
 *
 * ⚠️ 维护提醒:app.js 新增函数后,要同步补进末尾的 module.exports 清单。
 *
 * 本文件不叫 *.test.js,`node --test` 不会把它当测试执行。
 * 运行方式见 tests/README.md(**必须显式传文件列表**)。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/** 加载 app.js —— 有 module.exports,直接 require 即可 */
function loadApp() {
  return require(path.join(ROOT, 'app.js'));
}

/** 读仓库根目录的 JSON 数据文件;不存在返回 null(让调用方决定跳过还是失败) */
function loadJSON(name) {
  const p = path.join(ROOT, name);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

module.exports = { loadApp, loadJSON, ROOT };
