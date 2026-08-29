# 国乒赛程页 · 测试

零依赖,只用 Node 内置 `node:test`,**不需要 npm install**(守住零构建铁律)。

## 跑测试

```bash
node --test tests/logic.test.js tests/render.test.js tests/data-contract.test.js
```

> ⚠️ **必须显式列出文件**。`node --test tests/` 这种目录形式会报
> `MODULE_NOT_FOUND`(Node 会把目录下每个 .js 都当测试文件去 require,
> 包括 `_harness.js` 这类非测试文件)。

本机 Node 路径(managed):`/Users/pengzishang/.workbuddy/binaries/node/versions/22.22.2/bin/node`

## 文件说明

| 文件 | 职责 |
|---|---|
| `_harness.js` | 加载浏览器端 `app.js`(无 `module.exports`,用 `new Function` + 浏览器 stub 导出内部函数) |
| `_fixtures.js` | 共享测试样本,**全部来自真实 `data.json` 或子上截图** |
| `logic.test.js` | 解析器单测 + 铁律判定函数(对着历史 bug 写) |
| `render.test.js` | 渲染层 HTML 字符串断言(不装 jsdom,不测挂载层) |
| `data-contract.test.js` | `data.json` / `video.json` 结构与铁律契约校验 |

## 何时跑

- 改完 `app.js` 后
- **rebase / pull 到采集端新数据后**(新数据可能暴露旧逻辑的 bug —— 2026-08-29
  的「头号种子抽成『世界第』」就是 rebase 到新数据后才复现的)
- 部署前

## 加新测试的注意事项

1. **在 `_harness.js` 的 `EXPORT_LIST` 里补上要用的内部函数名**,否则拿不到。
2. 样本优先用真实的。臆造的样本容易「测试通过但线上翻车」——本项目两个
   潜伏 bug 都是只有真实数据才复现。
3. 解析器测试必须覆盖四类:① 正常拆解 ② 短文本/无结构 → `ok=false`
   ③ 空输入 ④ 回退路径不丢内容。
4. `getElementById` 的 stub **不能返回 `null`**,必须返回带 `addEventListener`
   的元素 —— `app.js` 顶层有 `document.getElementById('filter').addEventListener(...)`。

## 已知限制(记录在案)

- `parseNextRoster` 的名单段靠 lookahead 关键字(缺席/退赛/直播渠道/赛程/赛后/
  最近战报/头号种子/亚运名单/背景)截断。若 note 里一个都没有,会把后续文字
  一并吞进名单。真实数据都带这些关键字,暂时安全;将来若采集端改句式需同步补关键字。
  → 已写成 `logic.test.js` 的「[已知限制]」用例,将来改造时该用例会红,起到提醒作用。
