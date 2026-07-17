# Miku Pastel Codex Theme Pack

这是一个可独立保存、安装和维护的 macOS Codex 主题包。它包含 Miku
主界面壁纸、Hero 无人物场景、透明人物图、完整 Dream Skin 引擎快照、
本次主题涉及的精简引擎补丁、双击命令、验证脚本和后续换肤说明。

当前主题包版本为 `1.2.1`，要求 Dream Skin 引擎 `1.4.1` 或更高版本。

## 最常用的操作

如果这台 Mac 已经安装过 Dream Skin，只需要双击：

1. `03 Configure Miku Theme (No Restart).command`
2. 在你准备好时，自己重启 Codex；或者双击 `04 Start Miku Theme.command`
3. 进入一个任务页面后双击 `05 Verify Miku Theme.command`

如果需要从这个主题包重新安装完整引擎，先双击：

1. `02 Install Engine (No Restart).command`
2. `04 Start Miku Theme.command`

`02` 和 `03` 都不会重启 Codex。`04` 在 Codex 已运行但没有调试端口时会弹窗征求重启确认。

## 命令入口

| 文件 | 用途 | 是否重启 Codex |
| --- | --- | --- |
| `01 Sync Theme Sources.command` | 将主题源码和精简补丁同步到包内完整引擎，并运行测试 | 否 |
| `02 Install Engine (No Restart).command` | 安装包内完整引擎并保存 Miku 配置 | 否 |
| `03 Configure Miku Theme (No Restart).command` | 原子写入当前 Miku 主题，自动备份旧主题 | 否 |
| `04 Start Miku Theme.command` | 启动注入器并应用主题；必要时询问是否重启 | 可能 |
| `05 Verify Miku Theme.command` | 验证注入、生成截图和实时 DOM 审计 | 否 |
| `06 Restore Previous Theme (No Restart).command` | 恢复最近一次主题备份 | 否 |
| `07 Restore Official Appearance.command` | 移除注入并恢复官方外观配置 | 是 |
| `08 Run All Tests.command` | 校验资源、配置、脚本和完整引擎 | 否 |

对应的终端命令示例：

```bash
cd /Users/jim/Desktop/extensiveWork/project/Codex-Dream-Skin/miku-pastel
./scripts/configure-theme.sh --no-apply
./scripts/start-theme.sh
./scripts/verify-theme.sh
```

## 目录结构

```text
miku-pastel/
├── assets/                 # 真正注入 Codex 的纯背景资源
├── references/             # 效果参考图，只用于视觉对比
├── theme/theme.json        # 主题文案、色板、预设和背景入口
├── engine/                 # 可直接安装的完整 macOS 引擎快照
├── engine-overlay/         # 本次主题涉及的精简引擎改动
├── scripts/                # 包级安装、配置、启动、验证和恢复脚本
├── docs/                   # 实现记录、文件地图和换主题指南
├── output/                 # 验证截图与 DOM 审计结果
├── AGENTS.md               # 给 Codex/自动化代理的维护约束
├── CLAUDE.md               # 给 Claude Code 的维护说明
└── pack.json               # 主题包元数据和资源校验值
```

## 关键设计

- `references/effect-reference.png` 是包含完整模拟 UI 的效果图，绝不能作为运行时背景。
- `assets/miku-pastel-wallpaper.png` 是 New task 与对话页共用的主界面壁纸。
- `assets/background-hero.png` 是 Hero 内部无人物、无 UI 的霓虹场景背景。
- `assets/miku.png` 是透明人物层，会在真实卡片前后分层绘制。
- `assets/01_code_icon.png` 至 `04_tools_icon.png` 是四张原生建议卡片的透明主图标。
- `assets/miku-future-spritesheet.webp` 是经过 v2 校验的 8×11 透明 Pet 动画图集。
- 首页按参考图把完整角色主视觉、四张建议卡片和原生输入区组合成同一套青粉玻璃界面。
- New task 保持单屏构图，不会因透明人物越界效果产生纵向滚动。
- 对话页右下角使用主题窗口内的透明动画 Pet，不再使用带系统阴影的原生浮动窗口；
  Pet 支持拖动、位置记忆和状态动画，并会在摘要、右侧栏、底部面板等模块展开时自动让位。
- DOM 观察器只响应路由与已知模块锚点，流式消息、编辑器输入和主题自身写入不会触发整页重绘。
- 文件编辑器、Markdown/TeX、review diff 和终端使用独立的可读性色板，不跟随暗色 Electron token 产生白底白字。
- 设置页跟随 Codex 当前白天/夜间外观自动切换完整色板，权限卡片、侧栏、链接、
  开关和下拉菜单保持一致对比度。
- 主题通过本机 `127.0.0.1` 的 CDP 会话注入，不修改官方 `Codex.app`、`app.asar` 或代码签名。
- 活动主题保存在 `~/Library/Application Support/CodexDreamSkinStudio/theme`。
- 每次覆盖不同主题前，旧主题会保存到 `~/Library/Application Support/CodexDreamSkinStudio/theme-history`。
- 主题包不包含 `~/.codex/config.toml`、认证信息、任务内容或任何个人密钥。

更详细的实现过程见 [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)，创建下一套主题见 [docs/SWITCHING-THEMES.md](docs/SWITCHING-THEMES.md)。
