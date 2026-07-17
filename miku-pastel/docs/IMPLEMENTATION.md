# Miku Pastel 实现记录

## 1. 问题定位

最初的视觉目标图是 `references/effect-reference.png`。它不是普通壁纸，而是一张已经包含完整应用外壳的概念效果图：左侧导航、顶部标题、功能卡片、输入框、Outputs 区域和角色装饰都被画进了图片。

如果将它直接铺到真实 Codex 主区域，真实控件会再次绘制一遍，因此出现：

- 左侧栏与图片里的侧栏并存
- 输入框、消息内容和标题重影
- 透明白层叠加后整体发灰
- 图片中的卡片位置无法跟随真实窗口和消息高度
- 窄窗口裁切后模拟 UI 与真实 UI 完全错位

修正方案是把视觉目标拆成三层：

1. 主界面壁纸：`assets/miku-pastel-wallpaper.png`，由 New task 与对话页共用
2. Hero 场景层：`assets/background-hero.png`，只含霓虹舞台、音符、星光和装饰纹理
3. 透明人物层：`assets/miku.png`，在卡片前后各绘制一层形成越界景深
4. 卡片图标层：`assets/01_code_icon.png` 至 `04_tools_icon.png`，覆盖四个原生建议按钮的视觉图标
5. Pet 动画层：`assets/miku-future-spritesheet.webp`，在主题窗口内绘制透明 8×11 动画
6. 真实交互层：Codex 自己的侧栏、消息、代码、输入框和面板

运行时分别加载背景和透明人物。效果图继续保留，但仅用于取色、构图和视觉验收。

## 2. 当前视觉系统

主题主色定义在 `theme/theme.json`：

| Token | 色值 | 用途 |
| --- | --- | --- |
| `background` | `#ECFAFD` | 全局浅青背景 |
| `panel` | `#FFFFFF` | 主面板与高可读区域 |
| `panelAlt` | `#F6FDFF` | 次级面板 |
| `accent` | `#24C9C6` | Miku 青、主按钮和边框 |
| `accentAlt` | `#67E2DD` | 高光青 |
| `secondary` | `#F29DD1` | 粉色装饰和强调 |
| `highlight` | `#9B86EA` | 紫色辅助强调 |
| `text` | `#203941` | 主文字 |
| `muted` | `#6A858E` | 次级文字 |
| `line` | `rgba(36, 201, 198, .28)` | 玻璃面板描边 |

CSS 使用 `html.codex-dream-skin[data-dream-preset="miku-pastel"]` 作为主题作用域。主要处理：

- 左侧栏：浅青半透明玻璃和较高文字对比度
- 主区域：统一壁纸、柔和遮罩和内容安全区
- 任务内容：减少默认灰底，保留正文可读性
- 用户消息：淡粉至淡紫色气泡
- 代码块：浅色玻璃底和青色描边
- 文件与 diff：独立浅色编辑器 token，正文、行号、折叠区和增删行均保持可读
- Outputs：独立的白色磨砂面板
- Composer：白色高透明玻璃、青色聚焦轮廓
- 按钮：顶部栏、侧栏、Composer、Outputs 和分段操作统一青粉玻璃交互态
- 首页：无人物 Hero 场景、完整人物后层、原生建议卡、人物上半身前层和右下拍立得依次叠放；
  人物越过横幅边框并与卡片形成稳定错位，不再从带人物壁纸中猜测遮罩轮廓
- 响应式：在较窄宽度下降低装饰和背景干扰
- 首页滚动：New task 使用单屏裁切，人物越界层只参与视觉景深，不扩大滚动高度
- 对话 Pet：在主题窗口内绘制并保存拖动位置，固定摘要、右侧面板、底部面板或
  浮动模块展开时自动隐藏；原生 Pet 浮窗由注入器关闭，避免 BrowserWindow 阴影
- 设置页：根据 Codex 当前白天/夜间外观切换整套页面、侧栏、卡片、表单和浮层
  token，避免原生暗色卡片与 Miku 浅色文字变量混用

## 3. DOM 调研结论

适配时使用 Codex 的本机 loopback CDP 会话检查实际 DOM。当前版本 `26.707.91948` 的任务页主要锚点为：

```text
main.main-surface
aside.app-shell-left-panel
.app-shell-main-content-viewport
.app-shell-main-content-frame
.thread-scroll-container
.composer-surface-chrome
div.main-surface
div.app-shell-left-panel
```

旧实现依赖的通用 `[role="main"]` 和 `article` 在任务页常常不存在，或者范围过大。主题因此改用上面的应用容器，并对 Outputs、用户气泡和代码块使用组合选择器。

设置页使用 `div.main-surface` 与 `div.app-shell-left-panel`，注入器会标记设置路由并按
当前 `data-dream-shell` 分配明暗 token。`engine/tests/audit-live-dom.mjs` 会连接已经
验证属于 Codex 的本机 CDP 端口，检查任务页或设置页锚点、当前 preset、CSS
规则数量，以及设置卡片至少 `4.5:1` 的文字对比度。

## 4. 注入链路

运行流程如下：

```text
theme/theme.json + wallpaper + hero + character + 4 card icons + v2 pet atlas
        ↓ configure-theme.sh
Application Support/CodexDreamSkinStudio/theme
        ↓ start-dream-skin-macos.sh
官方 Codex 以 127.0.0.1 CDP 端口启动
        ↓ injector.mjs
renderer-inject.js + dream-skin.css + theme payload
        ↓
真实 Codex DOM 上的 Miku Pastel UI
```

注入器会在执行 `ensure` 时暂时断开 MutationObserver，只监听路由、侧栏、Composer
和已知辅助模块锚点。消息流、编辑器内容、tooltip 与主题自己写入的 `class/style`
都会被忽略；8 秒兜底检查负责覆盖无法观察到的少数路由变化。Pet 动画只更新单个
精灵节点的 `background-position`，不可见时暂停帧更新。

引擎不写入 `Codex.app`，不解包或修改 `app.asar`，也不重新签名应用。启动前会验证官方应用和内置 Node.js 的签名，并确认 CDP 监听端口属于 Codex 进程。

## 5. 主题包的两套引擎内容

`engine/` 是完整引擎快照，可以直接运行安装脚本。它让这个主题目录脱离上级仓库后仍能使用。

`engine-overlay/` 只保存本次 Miku preset 和 Codex DOM 适配涉及的文件。它用于将改动安全地同步到：

- 包内 `engine/`
- 上级开发目录 `../macos/`

同步脚本不会删除目标目录中的其他文件，也不会把整个旧引擎反向覆盖上游。

## 6. 配置和回退

`scripts/configure-theme.sh` 会：

1. 验证主题 JSON、背景文件和 SHA-256
2. 比较活动主题是否已经一致
3. 将不同的旧主题备份到 `theme-history`
4. 在临时目录中组装新主题
5. 使用目录重命名进行原子替换
6. 默认不启动、不重启 Codex

`scripts/restore-previous-theme.sh` 会恢复最新历史主题，并把当前主题再备份一次，因此可以在两个最近主题之间切换。恢复后需要运行对应主题包的启动命令才会应用到新的 Codex 会话。

## 7. 验证标准

自动验证包括：

- JSON 格式和主题 id 一致性
- 运行时背景与效果参考图的 SHA-256
- 主题源文件与完整引擎快照一致
- `engine-overlay` 与完整引擎对应文件一致
- Bash、JavaScript 和 MJS 语法
- 注入 payload 与图片载入
- Pet 图集 SHA-256、v2 尺寸、透明通道和运行时无阴影状态
- 自定义主题写入和清理
- Codex 配置往返不改变用户现有值
- HOME 恢复、签名和 doctor 检查

视觉验证包括：

- 注入状态
- 当前 preset
- 完整窗口截图
- 任务页 DOM 锚点
- 宽屏和窄屏下的角色裁切与文字对比

验证产物写入 `output/`，不作为主题源码提交。
