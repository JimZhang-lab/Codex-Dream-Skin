# CLAUDE.md

这是 Miku Pastel 的独立 Codex 主题包。使用 Claude Code 修改此目录时，先完整阅读 `AGENTS.md`；其中的安全边界、文件职责和验证要求同样适用于 Claude。

## 快速上下文

- 视觉目标：`references/effect-reference.png`
- New task 与对话页共用壁纸：`assets/miku-pastel-wallpaper.png`
- Hero 无人物场景：`assets/background-hero.png`
- 透明人物层：`assets/miku.png`
- 卡片图标：`assets/01_code_icon.png` 至 `assets/04_tools_icon.png`
- 主题配置：`theme/theme.json`
- 主题专属 CSS：`engine-overlay/assets/dream-skin.css` 中的 `data-dream-preset="miku-pastel"` 规则
- 注入状态传递：`engine-overlay/assets/renderer-inject.js`
- 注入与验证：`engine-overlay/scripts/injector.mjs`
- 完整可安装引擎：`engine/`
- 上级开发仓库：`../macos/`

效果参考图内部包含一套画出来的 Codex UI。不要直接把它复制到主题目录，也不要把它写入 `theme.json.image`。真实主题必须使用纯背景，否则会发生双层侧栏、双层输入框和文字重影。

## 修改主题时

只改色板、文案或背景时：

1. 修改 `theme/theme.json`。
2. 将新的纯背景放入 `assets/`，同步更新 `image` 字段。
3. 更新 `pack.json` 的资源校验值。
4. 运行 `./scripts/sync-engine.sh --test`。
5. 运行 `./scripts/test-package.sh`。
6. 未经明确要求，不执行启动或恢复官方外观命令。

需要改变布局或组件玻璃效果时：

1. 在 `engine-overlay/assets/dream-skin.css` 中修改 Miku preset 的限定规则。
2. 如果新增主题预设，检查 `renderer-inject.js`、`injector.mjs` 和 `write-theme.mjs` 的预设传递。
3. 使用当前 Codex 的实时 DOM 重新确认选择器，不要依赖旧截图猜类名。
4. 同步到 `engine/` 后运行完整测试。
5. 获得用户允许后再启动主题并运行截图和 DOM 审计。

## 创建下一套主题

建议复制整个 `miku-pastel/` 为同级新目录，然后按 `docs/SWITCHING-THEMES.md` 的清单逐项替换。若新主题沿用相同布局，只更换色板、文案和纯背景，可以继续复用 `miku-pastel` preset；若布局语义不同，应创建新的 preset，并在 CSS 中使用新的严格作用域。

克隆后至少搜索并替换：

```text
miku-pastel
Miku Pastel
Miku Codex
background-hero.png
miku.png
01_code_icon.png
02_puzzle_icon.png
03_checklist_icon.png
04_tools_icon.png
miku-pastel-verification.png
```

不要复制 `output/` 中的验证产物，不要打包 `~/Library/Application Support/CodexDreamSkinStudio` 的状态目录。

## 常用命令

```bash
# 仅检查将同步什么
./scripts/sync-engine.sh --dry-run

# 同步到包内完整引擎并测试
./scripts/sync-engine.sh --test

# 额外同步回上级 macos 开发目录
./scripts/sync-engine.sh --parent --test

# 仅保存主题，不重启
./scripts/configure-theme.sh --no-apply

# 包级完整验证
./scripts/test-package.sh
```

最终回复应明确说明：改了哪些源文件、是否重启过 Codex、测试结果、以及下一步应双击哪个命令。
