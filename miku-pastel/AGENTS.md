# AGENTS.md

本文件适用于 `miku-pastel/` 下的所有自动化修改。开始工作前先阅读本文件、`README.md` 和 `docs/IMPLEMENTATION.md`。

## 目标与边界

这个目录是 Miku Pastel 的可携带主题包。修改时必须同时保证：

1. 主题可以从本目录独立安装。
2. 可以把主题相关改动回灌到上级仓库的 `macos/`。
3. 不修改官方 Codex 应用包、`app.asar`、签名或系统安全设置。
4. 未经用户明确要求，不重启 Codex。
5. 不把效果参考图误当成运行时资源。

## 文件职责

- `theme/theme.json`：主题配置的唯一源文件。文案、色板、预设名、背景文件名都从这里读取。
- `assets/`：运行时资源。只放可以直接叠在真实 Codex UI 后方的纯背景或纹理。
- `references/effect-reference.png`：视觉目标，包含模拟 UI，只能用于对比和取色。
- `engine-overlay/`：本主题或本次适配真正修改过的引擎文件。目录结构必须镜像 `engine/` 和上级 `macos/`。
- `engine/`：完整、可安装的引擎快照。它是同步产物，但必须随包保持可运行。
- `scripts/`：主题包级工作流，不应依赖当前 shell 的工作目录。
- `output/`：验证产物，不提交截图和临时审计结果。

修改 `theme/`、`assets/` 或 `engine-overlay/` 后，运行：

```bash
./scripts/sync-engine.sh --test
./scripts/test-package.sh
```

需要把改动同步回上级仓库时，显式运行：

```bash
./scripts/sync-engine.sh --parent --test
```

不要在不知情的情况下把整个 `engine/` 反向覆盖到上级仓库；上级仓库可能已经有其他用户改动。回灌只通过 `engine-overlay/`、`theme/theme.json` 和 `assets/` 进行。

## 本次实现过程

1. 最初使用的 `miku-codex-theme.png` 是效果图，图片内部已经画好了侧栏、卡片、输入框和标题。
2. 将这张效果图直接作为真实 Codex 背景后，模拟 UI 与真实 UI 重叠，产生透明、错位和文字重复。
3. 因此重新制作了不含 UI 的 `miku-pastel-wallpaper.png`，只保留角色、柔和彩云、星光和装饰氛围。
4. 通过本机 loopback CDP 检查当前 Codex DOM，发现旧选择器如通用 `[role="main"]`、`article` 在任务页并不可靠。
5. 引擎增加 `preset` 传递，并为 `miku-pastel` 增加独立 CSS 规则，分别处理侧栏、任务背景、消息气泡、代码块、Outputs 面板、输入框和首页卡片。
6. 加入实时 DOM 审计与截图验证，避免只看“CSS 已注入”却没有检查实际页面结构。
7. 包级脚本采用原子替换和主题历史备份，便于下次切换主题和回退。

## 当前稳定的 DOM 锚点

适配 Codex `26.707.91948` 时确认过的主要锚点：

- 主区域：`main.main-surface`
- 左侧栏：`aside.app-shell-left-panel`
- 任务视口：`.app-shell-main-content-viewport`
- 任务框架：`.app-shell-main-content-frame`
- 消息滚动区：`.thread-scroll-container`
- 输入框：`.composer-surface-chrome`
- 用户消息：`.thread-scroll-container [class~='bg-token-foreground/5']`
- 代码块：`.thread-scroll-container [class*='_codeBlock_']`
- Outputs 面板：`main.main-surface [class~='rounded-3xl'][class~='bg-token-dropdown-background'][class~='pt-2.5']`

这些类来自未公开的应用 DOM，Codex 更新后可能改变。若视觉失效，先运行实时审计并重新检查 DOM，不要继续堆叠高优先级通用选择器。

## CSS 与视觉规则

- 主题专属规则必须限定在：

  ```css
  html.codex-dream-skin[data-dream-preset="miku-pastel"]
  ```

- 不要全局覆盖所有 `button`、`div`、`article` 或所有带背景类的元素。
- 优先使用主题 token 和稳定容器，再对少量已确认的组件补充选择器。
- 保持文字对比度，角色主体不能落在大段正文正下方。
- 侧栏透明度应低于主内容背景透明度，确保导航可读。
- 不要用 `filter` 或整体 `opacity` 处理主应用树，这会让文字和交互控件一起变淡。
- 不要强制 `appearanceTheme = "dark"`；本主题以浅色系统外观为基准。

## 资源规则

- 效果图与运行时背景必须分开存放。
- 替换运行时背景后，更新 `pack.json` 中的 SHA-256：

  ```bash
  shasum -a 256 assets/<image>
  ```

- 更新效果参考图时也要更新对应校验值。
- 运行时背景需要覆盖常见宽屏比例，边缘应允许 `cover` 裁切。
- 不要引入来源不明的图片；在发布前确认角色和素材的授权范围。

## 安全与状态

- 官方应用必须继续通过代码签名验证。
- 只允许连接 `127.0.0.1` 的 CDP 端口，并验证端口属于 Codex 进程。
- 不记录或打包用户任务、对话、令牌、SSH 密钥、`auth.json` 或完整 `config.toml`。
- `configure-theme.sh` 默认只写主题目录，不重启。
- 只有 `start-theme.sh` 和 `restore-official.sh` 允许涉及重启；前者需要用户确认，后者文件名明确说明恢复官方外观。
- 主题切换前保留历史备份；不要无提示删除 `theme-history`。

## 测试与交付

最小验证顺序：

```bash
./scripts/sync-engine.sh --test
./scripts/test-package.sh
./scripts/configure-theme.sh --no-apply
```

需要视觉验收时，在用户允许启动主题后：

```bash
./scripts/start-theme.sh
./scripts/verify-theme.sh
```

视觉检查至少覆盖：

- 首页与任务页
- 左侧栏展开和收起
- 长对话、代码块、用户消息气泡
- Outputs 面板
- 输入框聚焦与按钮状态
- 窄窗口和宽窗口

若修改是用户可见的引擎行为，应同步更新 `engine-overlay/CHANGELOG.md` 和完整引擎的 `CHANGELOG.md`。只有形成可交付版本时才更新引擎 `VERSION`；主题包版本独立记录在根目录 `VERSION` 和 `pack.json`。
