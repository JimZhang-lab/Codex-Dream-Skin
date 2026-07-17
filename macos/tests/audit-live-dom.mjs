import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const portIndex = process.argv.indexOf("--port");
const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 9341;

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error(`Invalid port: ${port}`);
}

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const isCodexTarget = (item) =>
  item.type === "page" &&
  item.url?.startsWith("app://") &&
  item.webSocketDebuggerUrl?.startsWith(`ws://127.0.0.1:${port}/`);
const target = targets.find((item) =>
  isCodexTarget(item) && item.url === "app://-/index.html"
) ?? targets.find((item) =>
  isCodexTarget(item) && !item.url.includes("avatar-overlay")
);

if (!target) throw new Error(`No Codex app target found on 127.0.0.1:${port}`);

const css = await fs.readFile(path.join(root, "assets", "dream-skin.css"), "utf8");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("CDP connection timed out")), 5000);
  socket.addEventListener("open", () => {
    clearTimeout(timeout);
    resolve();
  }, { once: true });
  socket.addEventListener("error", () => {
    clearTimeout(timeout);
    reject(new Error("CDP connection failed"));
  }, { once: true });
});

let nextId = 1;
const pending = new Map();
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(String(data));
  if (!message.id || !pending.has(message.id)) return;
  const waiter = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(message.error.message));
  else waiter.resolve(message.result);
});

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

await send("Runtime.enable");
const expression = `(() => {
  const detached = document.implementation.createHTMLDocument("dream-skin-css-audit");
  const style = detached.createElement("style");
  style.textContent = ${JSON.stringify(css)};
  detached.head.appendChild(style);

  const count = (selector) => {
    try { return document.querySelectorAll(selector).length; }
    catch (error) { return { error: error.message }; }
  };

  const selectors = {
    main: "main.main-surface",
    sidebar: "aside.app-shell-left-panel",
    taskViewport: ".app-shell-main-content-viewport",
    taskFrame: ".app-shell-main-content-frame",
    threadScroll: ".thread-scroll-container",
    composer: ".composer-surface-chrome",
    userBubble: ".thread-scroll-container [class~='bg-token-foreground/5']",
    codeBlock: ".thread-scroll-container [class*='_codeBlock_']",
    fileEditor: "main.main-surface .cm-editor",
    reviewDiff: "main.main-surface .codex-review-diff-card",
    outputsPanel: "main.main-surface [class~='rounded-3xl'][class~='bg-token-dropdown-background'][class~='pt-2.5']",
    homeRoot: ".dream-skin-home",
    homeHeading: ".dream-skin-home [data-feature='game-source']",
    homeSuggestions: ".dream-skin-home .group\\\\/home-suggestions button",
    homeProject: ".dream-skin-home .group\\\\/project-selector > button",
    settingsSurface: ".dream-miku-settings-surface",
    settingsSidebar: ".dream-miku-settings-sidebar",
    settingsCard: ".dream-miku-settings-card",
  };

  const counts = Object.fromEntries(
    Object.entries(selectors).map(([name, selector]) => [name, count(selector)])
  );
  const rootStyle = getComputedStyle(document.documentElement);
  const installedPreset = window.__CODEX_DREAM_SKIN_STATE__?.preset ?? null;
  const sidebarNavigationItems = [
    ...document.querySelectorAll("aside.app-shell-left-panel button[data-dream-miku-nav]")
  ];
  const sidebarNavigation = {
    itemCount: sidebarNavigationItems.length,
    generatedLabelCount: sidebarNavigationItems.reduce(
      (total, item) => total + item.querySelectorAll(":scope > .dream-miku-nav-label").length,
      0,
    ),
    selectedKeys: sidebarNavigationItems
      .filter((item) =>
        item.getAttribute("aria-current") === "page" ||
        item.getAttribute("aria-pressed") === "true" ||
        item.dataset.dreamMikuSelected === "true" ||
        item.classList.contains("bg-token-list-hover-background")
      )
      .map((item) => item.dataset.dreamMikuNav),
    nativeLabelsVisible: sidebarNavigationItems.every((item) => {
      const nativeContent = [...item.children].find((child) => !child.dataset?.dreamGenerated);
      if (!nativeContent) return false;
      const style = getComputedStyle(nativeContent);
      const rect = nativeContent.getBoundingClientRect();
      return style.opacity === "1" &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        rect.width > 0 &&
        rect.height > 0;
    }),
  };
  const sidebarSetupCardCount = document.querySelectorAll(
    "aside.app-shell-left-panel .dream-miku-progress-card"
  ).length;
  const homeElement = document.querySelector(".dream-skin-home");
  const homeStyle = homeElement ? getComputedStyle(homeElement) : null;
  const homeScroll = {
    present: Boolean(homeElement),
    overflowY: homeStyle?.overflowY ?? null,
    scrollTop: homeElement?.scrollTop ?? null,
    scrollHeight: homeElement?.scrollHeight ?? 0,
    clientHeight: homeElement?.clientHeight ?? 0,
    locked: !homeElement || (
      ["hidden", "clip"].includes(homeStyle?.overflowY) &&
      (homeElement?.scrollTop ?? 0) === 0
    ),
  };
  const moduleOpen = document.documentElement.getAttribute("data-dream-module-open") === "true";
  const petElement = document.querySelector(
    "#codex-dream-skin-chrome .dream-miku-window-pet"
  );
  const petSprite = petElement?.querySelector(".dream-miku-window-pet-sprite");
  const petRect = petElement?.getBoundingClientRect();
  const petStyle = petElement ? getComputedStyle(petElement) : null;
  const petSpriteStyle = petSprite ? getComputedStyle(petSprite) : null;
  const projectConversationAvatar = {
    present: Boolean(petElement),
    display: petStyle?.display ?? null,
    visibility: petStyle?.visibility ?? null,
    opacity: petStyle?.opacity ?? null,
    width: petRect?.width ?? 0,
    height: petRect?.height ?? 0,
    backgroundImage: petSpriteStyle?.backgroundImage ?? null,
    filter: petStyle?.filter ?? petSpriteStyle?.filter ?? null,
    boxShadow: petStyle?.boxShadow ?? petSpriteStyle?.boxShadow ?? null,
    pointerEvents: petStyle?.pointerEvents ?? null,
    state: petElement?.dataset.dreamPetState ?? null,
    visible: Boolean(
      petElement &&
      petStyle?.display !== "none" &&
      petStyle?.visibility !== "hidden" &&
      Number(petStyle?.opacity ?? 0) > 0 &&
      petRect &&
      petRect.width > 0 &&
      petRect.height > 0 &&
      petRect.right > 0 &&
      petRect.bottom > 0 &&
      petRect.left < innerWidth &&
      petRect.top < innerHeight
    ),
    moduleOpen,
    hiddenForModule: Boolean(moduleOpen && petElement && (
      petStyle?.display === "none" ||
      petStyle?.visibility === "hidden" ||
      Number(petStyle?.opacity ?? 1) === 0 ||
      !petRect?.width ||
      !petRect?.height
    )),
  };
  const tokens = {
    editorForeground: rootStyle.getPropertyValue("--color-token-editor-foreground").trim(),
    editorBackground: rootStyle.getPropertyValue("--vscode-editor-background").trim(),
    preformatForeground: rootStyle.getPropertyValue("--color-token-text-preformat-foreground").trim(),
    terminalBackground: rootStyle.getPropertyValue("--color-token-terminal-background").trim(),
    terminalForeground: rootStyle.getPropertyValue("--color-token-terminal-foreground").trim(),
  };
  const parseRgb = (value) => {
    const match = String(value || "").match(/rgba?\\(\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*,\\s*([\\d.]+)/i);
    return match ? { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) } : null;
  };
  const luminance = (rgb) => {
    if (!rgb) return null;
    const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const contrast = (foreground, background) => {
    const fg = luminance(parseRgb(foreground));
    const bg = luminance(parseRgb(background));
    if (fg === null || bg === null) return null;
    return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
  };
  const settingsCard = document.querySelector(".dream-miku-settings-card");
  const settingsCardStyle = settingsCard ? getComputedStyle(settingsCard) : null;
  const settings = {
    active: document.documentElement.getAttribute("data-dream-settings") === "true",
    shell: document.documentElement.getAttribute("data-dream-shell"),
    colorScheme: rootStyle.colorScheme,
    panelColor: rootStyle.getPropertyValue("--miku-settings-panel").trim(),
    textColor: settingsCardStyle?.color ?? null,
    contrast: settingsCardStyle
      ? contrast(settingsCardStyle.color, rootStyle.getPropertyValue("--miku-settings-panel").trim())
      : null,
  };
  const mikuEditorPass = installedPreset !== "miku-pastel" || (
    tokens.editorForeground.toLowerCase() === "#263f47" &&
    tokens.preformatForeground.toLowerCase() === "#31545d" &&
    tokens.terminalBackground !== tokens.terminalForeground
  );
  const settingsPass = !settings.active || (
    counts.settingsSurface === 1 &&
    counts.settingsSidebar === 1 &&
    counts.settingsCard >= 1 &&
    settings.colorScheme.includes(settings.shell) &&
    Number(settings.contrast) >= 4.5
  );
  const homePass = homeScroll.present && homeScroll.locked;
  const taskPass = settings.active || homePass || (
    counts.main === 1 &&
    counts.taskViewport >= 1 &&
    counts.taskFrame >= 1 &&
    counts.threadScroll >= 1 &&
    counts.composer >= 1
  );
  return {
    href: location.href,
    shell: document.documentElement.getAttribute("data-dream-shell"),
    installedPreset,
    cssRuleCount: style.sheet?.cssRules?.length ?? 0,
    counts,
    sidebarNavigation,
    sidebarSetupCardCount,
    homeScroll,
    projectConversationAvatar,
    settings,
    tokens,
    pass: taskPass &&
      settingsPass &&
      (settings.active || installedPreset !== "miku-pastel" || counts.sidebar === 0 || (
        sidebarNavigation.itemCount >= 3 &&
        sidebarNavigation.generatedLabelCount === 0 &&
        sidebarNavigation.selectedKeys.length <= 1 &&
        sidebarNavigation.nativeLabelsVisible &&
        sidebarSetupCardCount === 0
      )) &&
      (settings.active || homeScroll.present || installedPreset !== "miku-pastel" || (
        moduleOpen
          ? projectConversationAvatar.hiddenForModule
          : projectConversationAvatar.visible &&
            projectConversationAvatar.backgroundImage !== "none" &&
            projectConversationAvatar.filter === "none" &&
            projectConversationAvatar.boxShadow === "none" &&
            projectConversationAvatar.pointerEvents === "auto"
      )) &&
      mikuEditorPass &&
      (style.sheet?.cssRules?.length ?? 0) >= 100,
  };
})()`;

const evaluated = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
  awaitPromise: true,
});
socket.close();

if (evaluated.exceptionDetails) {
  throw new Error(evaluated.exceptionDetails.exception?.description ?? evaluated.exceptionDetails.text);
}

const result = evaluated.result?.value;
console.log(JSON.stringify(result, null, 2));
if (!result?.pass) process.exitCode = 2;
