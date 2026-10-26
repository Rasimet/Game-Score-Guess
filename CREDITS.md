# Credits / 来源说明

## 代码与构思

- 游戏具体玩法由本项目用户提出：公开左侧评分、隐藏右侧、点击较高者、右侧承接至下一轮、五次失误结束。
- 高低比较猜分是常见的游戏形式；本项目围绕游戏媒体评分实现自己的页面和状态逻辑。
- 第一版源代码、样式、测试、脚本和文档由 OpenAI Codex 按用户需求生成与修改。未复制课程示例或第三方教程源代码。

## 评分与游戏资料

- **Metacritic**：媒体综合评分的原始归属来源，https://www.metacritic.com/ 。
- **Steam / Valve**：通过公开商店接口取得游戏名称、PC 平台 Metacritic 评分与来源链接、发行日期和备用封面 URL。接口格式：`https://store.steampowered.com/api/appdetails?appids=APP_ID&l=english`。
- `dist/data/games.json` 保存每款游戏的 Steam App ID、评分、Metacritic 来源和商店链接，便于逐条核对。评分为 2026-10-26 获取的快照；不是 Metacritic 全量或实时数据。

## 图像、字体与权利

- 游戏封面/海报通过 `https://cdn.akamai.steamstatic.com/steam/apps/APP_ID/library_600x900.jpg` 及 Steam 返回的 `header_image` 远程加载。游戏图片、商标与名称归各自开发商、发行商及权利人所有。图片没有被当作自行创作或开源素材授权；本项目仅用于课堂演示。如准备超出课堂范围公开推广，应先确认相应使用许可或替换为获授权素材。公开仓库不打包第三方游戏原图。
- **DM Sans**、**Space Grotesk**：通过 Google Fonts 可选加载，https://fonts.google.com/ ，字体使用 SIL Open Font License；不可用时回退系统字体。
- 界面图形采用 Unicode 文字符号与 CSS，无额外图标库或生成图片。
- 截图为本地网页运行截图，其中出现的游戏图像仍归原权利人所有。

本项目与 Metacritic、Valve、Google 或任何游戏发行商无隶属或背书关系。来源说明不构成对第三方图像的再授权。
