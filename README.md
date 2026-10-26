# Score Duel · Steam 好评率对决

[中文说明](#中文说明) · [English](#english)

![中文版](docs/screenshot.png)
![English version](docs/screenshot-en.png)

## 中文说明

给游戏爱好者的小型互动网页：两款 Steam 游戏，谁的玩家好评率更高？选择封面，揭晓好评率，用五次失误机会挑战自己的游戏直觉。

### 快捷本地运行

需要 **Node.js 20 或更新版本**；没有第三方依赖，不需要安装 npm 包、API Key、IGDB 或 Twitch 账号。

**Windows：双击根目录的 `start-local.cmd`。** 它会启动服务器，并自动在默认浏览器打开游戏。若 Node 没有加入 PATH，会尝试使用本机已安装的 Codex Node 运行时。保持启动窗口打开，在其中按 `Ctrl+C` 或关闭窗口即可停止。

也可以进入仓库目录，在新终端运行：

```sh
node scripts/serve.mjs --open
```

本地网址：**http://127.0.0.1:4173/**。不想自动打开浏览器时，运行 `node scripts/serve.mjs`。安装了 npm 时也可使用 `npm start`。

重复启动会复用同版本的服务；启动窗口会保留状态和网址，不会直接闪退。若浏览器未自动打开，请手动打开 **http://127.0.0.1:4173/**；若显示已在运行，保留原来的服务器窗口即可，可以关闭此次重复启动的窗口。更新代码后请先停止旧服务器再启动。若端口被其他应用占用，会显示错误。不要直接双击 HTML，因为模块和题库需要 HTTP。

### 玩法与中英文切换

1. 左侧显示游戏名称、封面和 Steam 好评率；右侧好评率暂时隐藏。
2. 点击你认为好评率更高的封面，或按 `←` / `→`。
3. 揭晓双方好评率、评价数量和对错。比较显示的一位小数百分比，相同则两边都算答对。
4. 点击“下一轮”或按 `Enter`：右侧游戏移到左侧，并抽取新的右侧游戏。
5. 累计失误五次后，显示答对数、轮数和正确率；可重玩或回看最后一题。

右上角 **中文 / EN** 切换全部界面文案，包括规则、反馈、错误提示和成绩。语言选择保存在本浏览器；切换时保留当前轮次、游戏和分数。结束弹窗内也提供语言切换。游戏官方名称保留原文。

“重新开始”清空本局成绩，继续从累积题库中抽取；“刷新题库 · 新一局”重新尝试在线获取游戏，并清空本局成绩。两者都会保留本次打开网页期间的抽取记录，避免反复使用最近的小批次。重新加载网页会清空这份记录。刷新过程中暂时禁用选择，防止重复计分。

每款新出现的游戏都会记入已抽取记录，后续批次不会重新将它加入抽签；右侧承接到左侧是玩法本身，不计为重新抽取。新批次请求会排除最近收集的最多 500 个游戏 ID，并且同一批次不重复抽搜索页。用完已收集的游戏后先尝试获取新游戏；若无法获得更多，才重新洗牌，且不会将同一款游戏同时放到左右两侧。数据弹窗会显示累积题库数量与洗牌提示。离线题库有限，因此不能保证无限不重复。

### 评分与抽取范围

**好评率 = 好评数量 ÷ 总评价数量 × 100%，四舍五入到一位小数。** 不使用 Metacritic、IGDB 或 Steam 的 1–9 评价类别编号来充当分数。

统计通过 Steam 官方新评价接口 `IUserReviewsService/GetAppReviews/v1/` 获取，统一参数：所有语言、所有评价类型、Steam 购买者、过滤非相关活动、首个游标页面。只选 **评价数严格大于 500（即至少 501 条符合口径评价）** 的游戏。它是玩家评价占比，可能与按语言或其他设置筛选的商店页面显示不同。

- **在线取样**：从 Steam 当前可见商店搜索目录随机抽取结果页，打散页内候选，再通过官方评价 API 获取真实统计。每批最多 6 款，来自多个页面；新游戏会在当前批次用完后继续抽取。
- 搜索目录使用公开商店页面的 `search/results` 接口，它不是有稳定兼容保证的开发者 API。目录采用商店评价排序，筛掉评价太少的游戏；不承诺全 Steam 库覆盖或筛选后的均匀随机。下架、地区或商店偏好受限的游戏可能缺席。
- **缓存模式**：在线请求失败时，合并 `.cache/steam.json` 中最近保存的真实统计和仓库快照，按游戏 ID 去重；同一游戏优先使用缓存中的统计，界面按当前两款游戏的实际来源标注。这个本地缓存不提交到 Git。
- **快照模式**：没有可用缓存时，读取仓库内 `dist/data/games.json` 的 50 款真实 Steam 游戏统计；其中包含好评数、差评数、总评价数和获取时间，不是编造的演示分数。
- 单个游戏的在线评价统计缓存 10 分钟；Steam 匿名接口本身也可能缓存最多 10 分钟。界面明确标注来源模式，在“数据与致谢”中显示批次获取时间；每条数据另保留 `fetchedAt`。
- 图片先尝试 Steam 竖版海报，失败后使用备用商店图；均不可用则显示渐变和名称，仍能游玩。

更新仓库内的备用快照（联网；获取过少时保留旧文件）：

```sh
node scripts/refresh-data.mjs
```

脚本只刷新快照中已有的游戏。数据源文档：[Steam 评价 API](https://partner.steamgames.com/doc/webapi/IUserReviewsService)。旧的 `/appreviews/` 接口已弃用，本项目使用新接口。

### 检查与结构

```sh
node --test
```

测试覆盖：选择与重复点击、同分、第五次失误、重玩、右侧承接、跨批次与重玩去重、有限题库洗牌、真实快照的好评率计算、目录解析、官方接口参数、排除已收集游戏、断网合并回退和中英文文案完整性。

- `dist/index.html` / `styles.css`：页面、弹窗和响应式样式。
- `dist/app.js`：加载、双语渲染、交互和新游戏预加载。
- `dist/i18n.js`：中英文文本。
- `dist/engine.js`：比较、计分、轮次与随机抽取。
- `dist/pool.js`：累积题库、跨批次和重玩抽取记录、有限题库洗牌。
- `dist/data/games.json`：真实 Steam 评价统计快照。
- `scripts/steam.mjs`：Steam 目录和评价接口、缓存与回退。
- `scripts/serve.mjs`：本地 HTTP 服务及 `/api/games`。
- `scripts/refresh-data.mjs`：刷新离线快照。
- `start-local.cmd`：Windows 双击启动。
- `tests/`：Node 内置测试。

### 已知限制、来源与提交

在线功能需要运行 Node 后端；仅将 `dist/` 放到 GitHub Pages 等静态托管时，会进入真实快照模式。完整在线部署需要支持 Node.js 的服务，不能把旧版静态演示当作当前在线接口演示。

分数在前端可见，不提供防作弊。刷新网页会重开一局；仅语言偏好会保存。服务可用性与评分变化由 Steam 决定。

玩法由项目用户提出；代码、样式、脚本、测试与文档由 OpenAI Codex 按需求生成和修改，AI 记录见 [PROCESS.md](PROCESS.md)。未复制前面调研的 Metacritic 库代码。

评价数据来自 **Valve / Steam**。封面远程加载自 Steam CDN；游戏图片、名称和商标归各自权利人所有，未把第三方游戏原图打包进仓库。[DM Sans](https://fonts.google.com/specimen/DM+Sans) 和 [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) 通过 Google Fonts 可选加载，字体采用 SIL Open Font License；没有网络时使用系统字体。项目无 Valve 或发行商背书。

提交前仍需请至少一位其他人真实试用，并补齐 PROCESS；然后推送到自己账号下的公开 GitHub 仓库，退出登录检查可访问，再将仓库 URL 提交 Canvas。

## English

**Score Duel** is a small game for video game fans: choose which of two Steam games has the higher positive review percentage. The left percentage is visible, the right is hidden. After revealing the answer, the right game becomes the next round's left game. Five mistakes end the run.

### Run locally

Install **Node.js 20+**. No packages or API keys are required.

On Windows, double-click **`start-local.cmd`**. On any supported platform, open a terminal in this repository and run:

```sh
node scripts/serve.mjs --open
```

Open **http://127.0.0.1:4173/** if the browser does not open automatically. The Windows launcher keeps its status and URL visible. If it reports that the game is already running, keep the original server window open and close the duplicate launcher when ready. Keep the server running; press `Ctrl+C` to stop. `npm start` also works when npm is installed. Restart the server after backend changes.

Choose a cover or press `←` / `→`. After the reveal, use Next round or `Enter`. Percentages are rounded to one decimal; ties count as correct. Use **中文 / EN** to switch language without losing your current progress. The language preference persists in this browser.

The game accumulates fetched batches and remembers drawn games until the page is reloaded, including across replays and pool refreshes. It asks the server to exclude up to 500 collected IDs and samples distinct search pages within a batch. When unseen games run out, it tries another batch before reshuffling the available pool. Offline pools are finite, so repeats eventually become necessary; the data dialog explains when reshuffling has occurred. The right game moving left is the intended carry-over interaction.

### Data and limitations

Approval means `positive reviews / total reviews × 100`, using all languages, Steam purchases, off-topic filtering and more than 500 matching reviews. Scores come from the official [Steam review API](https://partner.steamgames.com/doc/webapi/IUserReviewsService), not Metacritic or IGDB.

Online mode samples pages from Steam's visible storefront catalogue and queries real review statistics. The storefront search endpoint has no stable developer API guarantee. Filtering and page sampling do not guarantee uniform selection across the whole Steam catalogue. Live data is cached for 10 minutes. If services fail, cached games and the bundled snapshot of 50 real games are merged by ID, preferring cached statistics for overlaps. Current games are labelled by their actual source. Each record preserves its counts, source and retrieval time.

A Node server is required for online sampling. Static hosting serves the snapshot fallback. Missing images do not stop the game. Gameplay state is not saved across reloads; only language is saved.

Run checks with `node --test`. Refresh the bundled snapshot with `node scripts/refresh-data.mjs`. For authorship, iteration, AI assistance and the still-required real user trial, see [PROCESS.md](PROCESS.md). Data, covers and trademarks belong to Steam / Valve and the respective game owners. Optional Google Fonts are DM Sans and Space Grotesk under the SIL Open Font License.
