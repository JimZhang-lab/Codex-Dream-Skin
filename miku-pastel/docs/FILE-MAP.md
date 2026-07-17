# 文件地图

## 主题源

| 路径 | 说明 |
| --- | --- |
| `pack.json` | 包 id、版本、最低引擎版本、资源路径和校验值 |
| `theme/theme.json` | 运行时主题配置的唯一源文件 |
| `assets/miku-pastel-wallpaper.png` | New task 与对话页共用的主界面壁纸 |
| `assets/background-hero.png` | Hero 内部的无人物霓虹场景背景 |
| `assets/miku.png` | 实际运行时透明人物前/后景层 |
| `assets/01_code_icon.png` … `04_tools_icon.png` | 四张原生建议卡片主图标 |
| `references/effect-reference.png` | 视觉效果基准，不参与运行 |

## 包级脚本

| 路径 | 说明 |
| --- | --- |
| `scripts/common.sh` | 路径、校验、版本比较、原子安装和主题历史 |
| `scripts/sync-engine.sh` | 同步源码到完整引擎，可选同步上级仓库 |
| `scripts/install-engine.sh` | 从包内完整快照安装引擎 |
| `scripts/configure-theme.sh` | 保存主题，默认不重启 |
| `scripts/start-theme.sh` | 配置后启动或热重载主题 |
| `scripts/verify-theme.sh` | 截图验证和实时 DOM 审计 |
| `scripts/restore-previous-theme.sh` | 恢复最近主题备份 |
| `scripts/restore-official.sh` | 恢复官方外观 |
| `scripts/test-package.sh` | 包与引擎完整测试 |

## 精简引擎补丁

| 路径 | 作用 |
| --- | --- |
| `engine-overlay/assets/dream-skin.css` | Miku preset 的主要视觉实现 |
| `engine-overlay/assets/renderer-inject.js` | 将 preset 与主题状态写入页面 |
| `engine-overlay/scripts/injector.mjs` | 组装、注入、验证和截图 |
| `engine-overlay/scripts/write-theme.mjs` | 写入带 preset 的主题 JSON |
| `engine-overlay/scripts/configure-miku-preset-macos.sh` | 引擎内置 Miku 配置入口 |
| `engine-overlay/tests/audit-live-dom.mjs` | 当前 Codex DOM 结构审计 |
| `engine-overlay/tests/run-tests.sh` | 引擎级回归测试 |

`engine-overlay/` 中还保留安装、构建、版本和说明文件的对应改动。运行 `scripts/sync-engine.sh` 时，这些文件按相同相对路径覆盖到目标引擎，但不会删除目标中的其他文件。

## 本机运行状态

以下目录不在主题包中：

| 路径 | 说明 |
| --- | --- |
| `~/.codex/codex-dream-skin-studio` | 已安装的引擎 |
| `~/Library/Application Support/CodexDreamSkinStudio/theme` | 当前活动主题 |
| `~/Library/Application Support/CodexDreamSkinStudio/theme-history` | 自动主题备份 |
| `~/Library/Application Support/CodexDreamSkinStudio/state.json` | 当前端口和注入器状态 |

不要把这些状态目录复制回主题包，它们可能包含机器相关路径和运行日志。
