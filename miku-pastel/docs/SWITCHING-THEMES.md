# 创建和切换下一套主题

## 选择复用级别

先判断新主题属于哪一种：

1. 只换背景、色板和文案：复用现有 `miku-pastel` preset 最省事。
2. 同一玻璃布局，但组件细节不同：复制 preset CSS，改为新的 preset 名。
3. 布局逻辑明显不同：新增独立 preset，并重新调研当前 Codex DOM。

不要为了名称不同就复制大量 CSS；也不要让完全不同的布局继续共用一个 preset。

## 克隆主题包

从 `miku-pastel` 的上级目录执行：

```bash
cp -R miku-pastel new-theme-id
rm -f new-theme-id/output/*
```

随后修改新目录中的：

- `pack.json`
- `VERSION`
- `theme/theme.json`
- `assets/`
- `references/effect-reference.png`
- 根目录 `.command` 文件名和内部提示
- `README.md`、`AGENTS.md`、`CLAUDE.md`
- 需要新布局时的 `engine-overlay/`

复制命令只是起点。不要直接使用 Miku 角色资源作为其他主题的发布资源。

## 准备视觉资源

效果图可以包含完整 UI，用于表达目标；运行时背景必须是纯背景。

纯背景建议：

- 不包含侧栏、输入框、按钮、文字或卡片
- 主体避开中间正文密集区
- 允许 `background-size: cover` 在左右或上下裁切
- 宽屏优先，建议至少约 1600 像素宽
- 在浅色文字区和代码区保留足够均匀的底色

将效果图放入 `references/`，将运行时图片放入 `assets/`。

## 修改主题配置

`theme/theme.json` 至少更新：

```json
{
  "id": "new-theme-id",
  "preset": "miku-pastel",
  "name": "New Theme",
  "image": "new-wallpaper.png",
  "colors": {}
}
```

若只复用 Miku 玻璃布局，可以保留 `"preset": "miku-pastel"`，同时更改主题 `id`。若创建新 preset，则必须同步更新 CSS、注入器的允许值或回退逻辑、写主题脚本和测试。

## 更新资源校验

执行：

```bash
shasum -a 256 assets/new-wallpaper.png
shasum -a 256 references/effect-reference.png
```

把结果写入 `pack.json.checksums`。同时更新：

- `id`
- `name`
- `packageVersion`
- `engineVersion`
- `runtimeAssets`

## 同步与测试

先预览：

```bash
./scripts/sync-engine.sh --dry-run
```

同步包内完整引擎：

```bash
./scripts/sync-engine.sh --test
./scripts/test-package.sh
```

确认无误后，如需把新 preset 回灌到上级开发仓库：

```bash
./scripts/sync-engine.sh --parent --test
```

## 安全切换

保存新主题但不重启：

```bash
./scripts/configure-theme.sh --no-apply
```

配置脚本会自动备份当前主题。准备好后再执行：

```bash
./scripts/start-theme.sh
```

若效果不理想，可从新主题包或原主题包执行：

```bash
./scripts/restore-previous-theme.sh
```

恢复官方界面使用：

```bash
./scripts/restore-official.sh
```

最后一条会停止注入并重启 Codex，应只在用户明确想恢复官方外观时运行。

## 视觉验收清单

- 效果图没有被误用为运行背景
- 角色或主体没有挡住任务正文
- 左侧栏文字、选中态和图标清晰
- 用户消息和代码块不受整体透明度影响
- Outputs 面板边界清楚
- 输入框聚焦、附件、麦克风和发送按钮可见
- 首页与任务页都没有重复标题或模拟控件
- 窄窗口无大面积错位
- 深浅系统外观切换不会出现黑底或不可读文字
- Codex 更新后实时 DOM 审计仍能找到关键容器
