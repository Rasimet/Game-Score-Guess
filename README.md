# Score Duel · 游戏评分对决

一个给游戏爱好者的轻量互动网页：两款游戏，谁的 Metacritic 媒体评分更高？用五次失误机会挑战自己的游戏直觉。

[Sites 在线演示（当前仅创建者可访问）](https://score-duel-assignment3.mossycrown51.chatgpt.site)。课堂提交仍需公开 GitHub 仓库，不要把私有演示当作公开提交链接。

![Score Duel 网页截图](docs/screenshot.png)

## 玩法

1. 左侧展示游戏封面、名称和 PC 平台 Metascore；右侧只展示封面和名称。
2. 点击你认为评分更高的游戏封面，或按方向键 `←` / `→`。
3. 两边评分揭晓，显示正确或错误反馈。同分时选哪边都算答对。
4. 点击“下一轮”或按 `Enter`：上一轮右侧游戏移到左侧，右侧随机出现另一款游戏。
5. 累计失误五次后结束，显示答对数量、总轮数和正确率；点击“再玩一次”重新开始。

可以随时打开“怎么玩”和“数据与致谢”。“重新开始”会清空当前局的成绩。结果揭晓后封面按钮会禁用，重复点击不会重复计分。关闭结束弹窗可回看最后一题，再点“查看成绩”返回成绩。

## 本地运行

需要 **Node.js 20 或更新版本**，没有第三方 JavaScript 包，不需要 `npm install`、Python、API 密钥或付费账号。

### Windows 一键启动

直接双击仓库根目录的 **`start-local.cmd`**：自动启动本地服务器，并在默认浏览器打开游戏。路径包含空格时也可以使用，不需要先打开终端。

启动窗口保持打开；在窗口里按 `Ctrl+C` 或关闭窗口即可停止。如果游戏已经运行，再次双击只会打开现有网页，不会创建第二个服务器。若 Node 没有加入 PATH，启动文件也会尝试使用本机已安装的 Codex Node 运行时；两者都不可用时会提示安装 Node.js。

### 终端一行启动

从新终端进入本仓库目录，运行：

```sh
node scripts/serve.mjs --open
```

如果安装了 npm，也可以运行 `npm start`，效果相同。若不想自动打开浏览器，使用 `node scripts/serve.mjs`。

本地地址：**http://127.0.0.1:4173**。按 `Ctrl+C` 停止服务器。不要直接双击 HTML：模块和题库需要通过 HTTP 加载。若 4173 被其他应用占用，服务器会提示错误，不会关闭其他应用。

## 数据从哪里来

- 随机抽取范围是 `dist/data/games.json` 内的 **50 款游戏**，并非整个 Metacritic 网站。采用 Fisher–Yates 洗牌，当前题库抽完后重新洗牌；相邻两张卡片不会是同一游戏。
- 评分来自 Steam 商店公开接口 `https://store.steampowered.com/api/appdetails?appids=APP_ID&l=english` 的 `metacritic.score` 字段，同时保留 `metacritic.url` 来源链接。
- 全部统一采用 **PC 平台媒体评分**，不是玩家评分，也不混用主机平台分数。题库保存的是 2026-10-26 获取的快照，Steam 可能缓存旧评分，与 Metacritic 当前页面可能有差异。
- 游戏名、商店发行日期、备用横图同样来自 Steam。卡片年份是商店记录的发行年份，不一定是游戏最早发行年份。
- 开始游戏时只读取本地题库，不会现场调用 Steam 或 Metacritic。封面和可选网络字体需要网络；图片全部失败时，游戏名、渐变背景和分数仍然可以使用。
- 每张卡片在评分已公开后提供来源链接；右侧揭晓前隐藏来源链接，避免链接泄露答案。

如要更新评分（需要联网，失败时保留原题库）：

```sh
node scripts/refresh-data.mjs
```

该脚本只请求预先列出的 Steam 游戏 ID，跳过未提供评分的条目。更新后请检查数量与来源，并重新运行测试；题库数量可能改变。

### 能否通过 API 实时读取整个 Metacritic 游戏库？

2026-10-26 调研时，没有找到面向普通开发者、覆盖整个 Metacritic 游戏库的官方公开 API 文档。已公开的 [Fabric Origin Metacritic API 文档](https://developer.origin.fabricdata.com/origin/apis-all/metacritic-api-docs) 要求付费订阅与开发者审核，而且只列出电影和电视剧端点，不满足这个小游戏的需求。

[RAWG 游戏 API](https://rawg.io/apidocs) 是可考虑的替代方案：包含 Metacritic 评分、封面和游戏平台资料，需要自己的 API Key。它属于第三方数据库，不能保证覆盖 Metacritic 全库或与原站实时同步。要接入时，应在后端保存 Key、检查平台对应的评分、处理限额与超时，并在服务不可用时回退到示例题库。

当前版本没有接入 RAWG、没有使用 Metacritic 网站内部接口，默认仍从本地题库随机抽取。更新本地快照也不等同于每轮实时访问 Metacritic。

## 测试

```sh
node --test tests/engine.test.mjs
```

六项自动化测试覆盖：揭晓与重复点击、同分判对、第五次失误与重玩、右侧承接与长局抽取、非法题库、实际题库完整性。

浏览器检查包含：点击选择、方向键、Enter 下一轮、五次失误弹窗、重玩、390px 手机断点与 1280px 桌面断点，以及题库缺失时的提示和恢复。技术检查不是作业要求的真人试用；真实试用记录尚待填写，见 `PROCESS.md`。

## 项目结构

- `dist/index.html`：页面结构、规则、来源说明与结束弹窗。
- `dist/styles.css`：桌面/手机布局、卡片与反馈样式。
- `dist/app.js`：界面渲染、加载题库、图片降级、鼠标和键盘事件。
- `dist/engine.js`：游戏状态、随机抽题、计分与轮次。
- `dist/data/games.json`：可离线使用的评分快照。
- `scripts/serve.mjs`：无第三方依赖的本地 HTTP 服务器。
- `start-local.cmd`：Windows 双击启动、自动打开浏览器。
- `scripts/refresh-data.mjs`：可选的数据更新脚本。
- `tests/engine.test.mjs`：游戏规则测试。

## 已知限制与提交

- 这是学习用途的纯前端小游戏，评分数据可以从源文件查看，不提供防作弊功能。
- 不保存游戏进度；刷新或重开页面会开启新局。
- 题库仅包含有 Steam 评分数据的部分 PC 游戏，不代表全平台或完整游戏目录。
- 尚需真实用户试用，并由本人完成、审阅 `PROCESS.md`。
- 当前 Git 历史记录了开发阶段；提交前需要推送到你自己的 **公开 GitHub 仓库**，退出登录检查可访问性，再把仓库 URL 提交到 Canvas。Sites 演示不替代 GitHub 仓库提交。
- 网页源文件位于 `dist/`，可部署到任意静态托管；若使用 GitHub Pages，需要配置发布 `dist/` 的工作流。

## 来源与致谢

- 玩法由项目用户提出，第一版代码、样式、脚本、测试和文档由 OpenAI Codex 按需求生成与修改。未使用课程示例或第三方教程源代码；详细 AI 使用记录见 [PROCESS.md](PROCESS.md)。
- 原始评分归属 [Metacritic](https://www.metacritic.com/)，本题库通过 Steam 商店公开接口获取其提供的 PC Metacritic 评分。每条记录保存原始来源和 [Steam](https://store.steampowered.com/) 商店链接。
- 游戏封面从 Steam CDN 远程加载，图像、名称和商标归各自权利人所有；本项目仅用于课堂演示，未将游戏原图打包进仓库。截图中的游戏图像仍归原权利人所有。
- [DM Sans](https://fonts.google.com/specimen/DM+Sans) 和 [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) 通过 Google Fonts 可选加载，使用 SIL Open Font License；离线回退到系统字体。图形符号使用 Unicode 与 CSS。
- 本项目与 Metacritic、Valve、Google 或游戏发行商无隶属或背书关系。
