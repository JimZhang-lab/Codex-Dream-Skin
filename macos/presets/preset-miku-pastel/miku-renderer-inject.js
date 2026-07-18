((cssText, artDataUrl, sceneDataUrl, characterDataUrl, cardIconDataUrls, petDataUrl, themeConfig) => {
  const STATE_KEY = "__CODEX_DREAM_SKIN_STATE__";
  const DISABLED_KEY = "__CODEX_DREAM_SKIN_DISABLED__";
  const STYLE_ID = "codex-dream-skin-style";
  const CHROME_ID = "codex-dream-skin-chrome";
  const SHELL_ATTR = "data-dream-shell";
  const PRESET_ATTR = "data-dream-preset";
  const SETTINGS_ATTR = "data-dream-settings";
  const MODULE_ATTR = "data-dream-module-open";
  const PET_POSITION_KEY = "codex-dream-skin:miku-pet-position:v1";
  const PET_CONTROLLERS_KEY = "__CODEX_DREAM_SKIN_PET_CONTROLLERS__";
  const VERSION = __DREAM_SKIN_VERSION_JSON__;
  const STYLE_REVISION = __DREAM_SKIN_STYLE_REVISION_JSON__;
  const PAYLOAD_REVISION = __DREAM_SKIN_PAYLOAD_REVISION_JSON__;
  const THEME = themeConfig && typeof themeConfig === "object" ? themeConfig : {};
  const THEME_VARIABLES = [
    "--ds-bg", "--ds-panel", "--ds-panel-2", "--ds-green", "--ds-lime",
    "--ds-cyan", "--ds-purple", "--ds-text", "--ds-muted", "--ds-line",
    "--dream-skin-name", "--dream-skin-tagline", "--dream-skin-project-prefix",
    "--dream-skin-project-label",
  ];
  window[DISABLED_KEY] = false;

  const previous = window[STATE_KEY];
  if (previous?.observer) previous.observer.disconnect();
  if (previous?.timer) clearInterval(previous.timer);
  if (previous?.scheduler?.timeout) clearTimeout(previous.scheduler.timeout);
  if (previous?.resizeHandler) window.removeEventListener("resize", previous.resizeHandler);
  if (previous?.mediaHandler && previous?.mediaQuery) {
    try { previous.mediaQuery.removeEventListener("change", previous.mediaHandler); } catch {}
  }
  if (previous?.artUrl) URL.revokeObjectURL(previous.artUrl);
  if (previous?.sceneUrl) URL.revokeObjectURL(previous.sceneUrl);
  if (previous?.characterUrl) URL.revokeObjectURL(previous.characterUrl);
  const previousPetControllers = new Set();
  if (previous?.petController?.destroy) previousPetControllers.add(previous.petController);
  if (window[PET_CONTROLLERS_KEY] instanceof Set) {
    for (const controller of window[PET_CONTROLLERS_KEY]) {
      if (controller?.destroy) previousPetControllers.add(controller);
    }
  }
  for (const controller of previousPetControllers) controller.destroy();
  window[PET_CONTROLLERS_KEY] = new Set();
  const legacyPetNode = document.querySelector(`#${CHROME_ID} .dream-miku-window-pet`);
  if (legacyPetNode && !legacyPetNode.querySelector(".dream-miku-window-pet-viewport")) {
    legacyPetNode.remove();
  }
  if (previous?.petUrl) URL.revokeObjectURL(previous.petUrl);
  for (const url of previous?.cardIconUrls || []) URL.revokeObjectURL(url);

  const objectUrlFromData = (dataUrl) => {
    if (!dataUrl || typeof dataUrl !== "string") return null;
    const comma = dataUrl.indexOf(",");
    if (comma < 0) return null;
    const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1] || "image/png";
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  };
  const artUrl = objectUrlFromData(artDataUrl);
  const sceneUrl = objectUrlFromData(sceneDataUrl);
  const characterUrl = objectUrlFromData(characterDataUrl);
  const petUrl = objectUrlFromData(petDataUrl);
  const cardIconUrls = Array.isArray(cardIconDataUrls)
    ? cardIconDataUrls.map(objectUrlFromData).filter(Boolean)
    : [];

  const cssString = (value) => JSON.stringify(String(value ?? ""));
  const setAttributeIfChanged = (node, name, value) => {
    if (!node) return;
    const next = String(value);
    if (node.getAttribute(name) !== next) node.setAttribute(name, next);
  };
  const setStyleIfChanged = (node, name, value) => {
    if (!node) return;
    const next = String(value);
    if (node.style.getPropertyValue(name) !== next) node.style.setProperty(name, next);
  };
  const removeStyleIfPresent = (node, name) => {
    if (node?.style?.getPropertyValue(name)) node.style.removeProperty(name);
  };
  const setTextIfChanged = (node, value) => {
    if (node && node.textContent !== String(value ?? "")) node.textContent = String(value ?? "");
  };

  const parseRgb = (value) => {
    if (!value || value === "transparent") return null;
    const m = String(value).match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (!m) return null;
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  };

  const luminance = ({ r, g, b }) => {
    const lin = [r, g, b].map((c) => {
      const x = c / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  };

  /** Detect Codex app light/dark shell for CSS branching. */
  const detectShellMode = () => {
    const root = document.documentElement;
    const body = document.body;
    const cls = `${root.className || ""} ${body?.className || ""}`.toLowerCase();

    if (/\b(dark|theme-dark|appearance-dark)\b/.test(cls)) return "dark";
    if (/\b(light|theme-light|appearance-light)\b/.test(cls)) return "light";

    const dataTheme = (
      root.getAttribute("data-theme") ||
      root.getAttribute("data-appearance") ||
      root.getAttribute("data-color-mode") ||
      body?.getAttribute("data-theme") ||
      body?.getAttribute("data-appearance") ||
      ""
    ).toLowerCase();
    if (dataTheme.includes("dark")) return "dark";
    if (dataTheme.includes("light")) return "light";

    // Radios in profile menu (if present in DOM)
    const checked = document.querySelector('input[name="appearance-theme"]:checked');
    if (checked) {
      const label = (checked.getAttribute("aria-label") || checked.value || "").toLowerCase();
      if (label.includes("暗") || label.includes("dark")) return "dark";
      if (label.includes("浅") || label.includes("light")) return "light";
      if (label.includes("系统") || label.includes("system")) {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
    }

    try {
      const cs = getComputedStyle(root).colorScheme || "";
      if (cs.includes("dark") && !cs.includes("light")) return "dark";
      if (cs.includes("light") && !cs.includes("dark")) return "light";
    } catch {}

    // Background luminance of main surfaces
    const samples = [
      body,
      document.querySelector("main.main-surface"),
      document.querySelector("aside.app-shell-left-panel"),
    ].filter(Boolean);
    let votesLight = 0;
    let votesDark = 0;
    for (const el of samples) {
      try {
        const rgb = parseRgb(getComputedStyle(el).backgroundColor);
        if (!rgb) continue;
        const L = luminance(rgb);
        if (L >= 0.55) votesLight += 1;
        else if (L <= 0.25) votesDark += 1;
      } catch {}
    }
    if (votesLight > votesDark) return "light";
    if (votesDark > votesLight) return "dark";

    try {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    } catch {}
    return "light";
  };

  const applyTheme = (root, shell) => {
    const colors = THEME.colors || {};
    const isMikuPastel = (THEME.preset || "classic") === "miku-pastel";
    const accent = colors.accent || (shell === "light" ? "#e25563" : "#7cff46");
    const accentAlt = colors.accentAlt || accent;
    const secondary = colors.secondary || (shell === "light" ? "#f3a8af" : "#36d7e8");
    const highlight = colors.highlight || (shell === "light" ? "#c93d4c" : "#642a8c");

    let variables;
    if (shell === "light") {
      variables = {
        "--ds-bg": colors.background || "#f6f2f3",
        "--ds-panel": colors.panel || "#ffffff",
        "--ds-panel-2": colors.panelAlt || "#fff7f8",
        "--ds-green": accent,
        "--ds-lime": accentAlt,
        "--ds-cyan": secondary,
        "--ds-purple": highlight,
        "--ds-text": colors.text || "#1f1a1b",
        "--ds-muted": colors.muted || "#6b5f62",
        "--ds-line": colors.line || "rgba(196, 120, 128, .22)",
      };
    } else {
      variables = {
        // Miku's supplied palette is intentionally light. Do not carry its
        // light backgrounds or dark text into Codex's native dark shell.
        "--ds-bg": isMikuPastel ? "#07171e" : (colors.background || "#071116"),
        "--ds-panel": isMikuPastel ? "#0d222b" : (colors.panel || "#0b1a20"),
        "--ds-panel-2": isMikuPastel ? "#112b35" : (colors.panelAlt || "#10272c"),
        "--ds-green": accent,
        "--ds-lime": accentAlt,
        "--ds-cyan": secondary,
        "--ds-purple": highlight,
        "--ds-text": isMikuPastel ? "#e9fbfd" : (colors.text || "#e9fff1"),
        "--ds-muted": isMikuPastel ? "#b6d7db" : (colors.muted || "#9ebdb3"),
        "--ds-line": isMikuPastel ? "rgba(82, 218, 214, .28)" : (colors.line || "rgba(124, 255, 70, .28)"),
      };
    }

    for (const [name, value] of Object.entries(variables)) {
      if (typeof value === "string" && value) setStyleIfChanged(root, name, value);
    }
    setStyleIfChanged(root, "--dream-skin-name", cssString(THEME.name || "Codex Dream Skin"));
    setStyleIfChanged(root, "--dream-skin-tagline", cssString(THEME.tagline || "Make something wonderful."));
    setStyleIfChanged(root, "--dream-skin-project-prefix", cssString(THEME.projectPrefix || "选择项目 · "));
    setStyleIfChanged(root, "--dream-skin-project-label", cssString(THEME.projectLabel || "◉  选择项目"));
    root.toggleAttribute("data-dream-card-icons", cardIconUrls.length === 4);
    cardIconUrls.forEach((url, index) => {
      setStyleIfChanged(root, `--dream-miku-card-icon-${index + 1}`, `url("${url}")`);
    });
  };

  const MIKU_ICON_PATHS = {
    star: `
      <path d="m12 2.8 2.62 5.3 5.85.85-4.24 4.13 1 5.83L12 16.05 6.77 18.8l1-5.83-4.24-4.13 5.85-.85L12 2.8Z"/>
      <path d="M18.5 3.5v3M20 5h-3"/>`,
    search: `
      <circle cx="10.5" cy="10.5" r="5.75"/>
      <path d="m14.8 14.8 4.1 4.1M18.2 4.1v2.8M19.6 5.5h-2.8"/>`,
    plus: `
      <circle cx="12" cy="12" r="8.2"/>
      <path d="M12 8v8M8 12h8"/>`,
    calendar: `
      <rect x="4" y="5.2" width="16" height="14.2" rx="3"/>
      <path d="M8 3.7v3M16 3.7v3M4 9h16M8 12h2M14 12h2M8 15.5h2"/>`,
    cube: `
      <path d="m12 3.5 7.2 4.1v8.8L12 20.5l-7.2-4.1V7.6L12 3.5Z"/>
      <path d="m5 7.8 7 4 7-4M12 12v8.1M8.2 5.7l7.2 4.1"/>`,
    branch: `
      <circle cx="7" cy="5.5" r="2.1"/><circle cx="17" cy="7.5" r="2.1"/><circle cx="7" cy="18.5" r="2.1"/>
      <path d="M7 7.6v8.8M9.1 6.2h2.2c3.2 0 5.7 1.8 5.7 4.8v4.2M14.8 13l2.2 2.2 2.2-2.2"/>`,
    chat: `
      <path d="M5 5.3h14v10.1H10l-4.7 3.3.8-3.3H5a2 2 0 0 1-2-2V7.3a2 2 0 0 1 2-2Z"/>
      <path d="M7.2 9h9.6M7.2 12h6.1"/>`,
    planet: `
      <circle cx="12" cy="12" r="5.6"/>
      <path d="M3.3 15.2c1.3 2.1 6.4 1.4 11.3-1.5s7.7-6.9 6.4-9c-.7-1.1-2.4-1.3-4.7-.7M6.4 8.2c-2.8 2.3-4.2 4.8-3.1 7"/>
      <circle cx="15.5" cy="9" r=".8" class="dream-miku-icon-dot"/>`,
    music: `
      <path d="M9 17.5V6.8l9-2v10.7"/>
      <ellipse cx="6.5" cy="17.5" rx="2.5" ry="1.8"/><ellipse cx="15.5" cy="15.5" rx="2.5" ry="1.8"/>
      <path d="m9 9 9-2"/>`,
    sparkle: `
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/>
      <path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/>`,
    image: `
      <rect x="3.5" y="4.5" width="17" height="15" rx="3"/>
      <circle cx="9" cy="10" r="2"/>
      <path d="m5.5 17 4.2-4.1 2.8 2.5 2.3-2.1 3.7 3.7"/>`,
    shirt: `
      <path d="M8.2 4.5 4 6.7l2 4 2-1v9h8v-9l2 1 2-4-4.2-2.2c-.7 1.2-2 2-3.8 2s-3.1-.8-3.8-2Z"/>
      <path d="M9.2 4.2c.5 1 1.4 1.5 2.8 1.5s2.3-.5 2.8-1.5"/>`,
    heart: `
      <path d="M12 20S4 15.5 4 9.3C4 6.5 5.9 4.7 8.3 4.7c1.5 0 2.9.8 3.7 2.1.8-1.3 2.2-2.1 3.7-2.1 2.4 0 4.3 1.8 4.3 4.6C20 15.5 12 20 12 20Z"/>`,
    check: `
      <circle cx="12" cy="12" r="8.2"/>
      <path d="m8.3 12.2 2.3 2.3 5.2-5.4"/>`,
    code: `
      <path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15"/>`,
    puzzle: `
      <path d="M4.5 5.5h5a2.7 2.7 0 1 1 5.4 0h4.6v4.4a2.7 2.7 0 1 1 0 5.4v4.2h-4.4a2.7 2.7 0 1 0-5.4 0H4.5v-4.8a2.7 2.7 0 1 1 0-5.4V5.5Z"/>`,
    clipboard: `
      <rect x="5" y="5" width="14" height="16" rx="2.5"/>
      <path d="M9 5V3.5h6V5M8.5 10.2l1.3 1.3 2.4-2.5M13.5 10.5h3M8.5 15l1.3 1.3 2.4-2.5M13.5 15.3h3"/>`,
    tools: `
      <path d="M14.7 6.6a4.5 4.5 0 0 0-5.8 5.8l-5.1 5.1a2 2 0 0 0 2.8 2.8l5.1-5.1a4.5 4.5 0 0 0 5.8-5.8l-2.7 2.7-2.8-2.8 2.7-2.7Z"/>
      <path d="m14.5 15.5 4.8 4.8M17.2 12.8l3.1 3.1"/>`,
    folder: `
      <path d="M3.5 7.2h6l1.8 2h9.2v8.3a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7.2Z"/>
      <path d="M3.5 9.2V6.5a2 2 0 0 1 2-2H9l1.8 2h7.7a2 2 0 0 1 2 2v.7"/>`,
    lock: `
      <rect x="5" y="10" width="14" height="10" rx="3"/>
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10M12 14v2.5"/>`,
    microphone: `
      <rect x="9" y="3.5" width="6" height="11" rx="3"/>
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6"/>`,
    send: `
      <path d="m4 11.5 15.5-7-5 15-3-6-7.5-2Z"/>
      <path d="m11.5 13.5 8-9"/>`,
    stop: `
      <rect x="7.4" y="7.4" width="9.2" height="9.2" rx="1.7"/>`,
    pause: `
      <path d="M9 7.2v9.6M15 7.2v9.6"/>`,
    paperclip: `
      <path d="m8 12.5 6.8-6.8a3 3 0 0 1 4.2 4.2l-8.6 8.6a4.5 4.5 0 0 1-6.4-6.4l8.2-8.2"/>
      <path d="m7.2 15.2 8.1-8.1"/>`,
  };

  const mikuIcon = (name, className = "") => `
    <svg class="dream-miku-svg ${className}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">${MIKU_ICON_PATHS[name] || MIKU_ICON_PATHS.sparkle}</svg>`;

  const compactText = (node) => String(node?.innerText || "").replace(/\s+/g, " ").trim();

  const nativeText = (node) => {
    if (!node) return "";
    const clone = node.cloneNode(true);
    clone.querySelectorAll?.("[data-dream-generated]").forEach((generated) => generated.remove());
    return compactText(clone);
  };

  const concealNativeProfileAvatar = (profile) => {
    if (!profile) return;
    const isGenerated = (node) => node.dataset?.dreamGenerated === "miku";
    const isCompactInitial = (node) => {
      if (isGenerated(node)) return false;
      const initials = compactText(node);
      if (!/^[\p{L}\p{N}]{1,4}$/u.test(initials)) return false;
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.width <= 56 && rect.height > 0 && rect.height <= 56;
    };
    const avatarNodes = new Set([
      ...profile.querySelectorAll('img, [class*="avatar" i], [data-testid*="avatar" i], [data-avatar], [role="img"]'),
      ...[...profile.querySelectorAll("span, div")].filter(isCompactInitial),
    ]);
    for (const node of avatarNodes) {
      if (node !== profile && !isGenerated(node)) node.classList?.add("dream-miku-native-profile-avatar");
    }
  };

  const navigationLabel = (node) => nativeText(node)
    .replace(/[⌘⌥⇧⌃].*$/, "")
    .trim();

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const detectMikuLanguage = () => {
    const aside = document.querySelector("aside.app-shell-left-panel");
    const texts = aside ? [...aside.querySelectorAll("button")].map(navigationLabel) : [];
    if (texts.some((text) => /^(新建任务|已安排|项目|任务|聊天|插件|技能)$/.test(text))) return "zh";
    return "en";
  };

  const putTextInComposer = (value) => {
    const editable = document.querySelector('.composer-surface-chrome [contenteditable="true"]');
    if (!editable) return;
    editable.focus();
    try {
      document.execCommand("selectAll", false);
      document.execCommand("insertText", false, value);
    } catch {
      editable.textContent = value;
      editable.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: value,
      }));
    }
  };

  const ensureGenerated = (parent, className, html, prepend = false, contentKey = null) => {
    if (!parent) return null;
    let node = [...parent.children].find((child) => child.classList?.contains(className));
    if (!node) {
      node = document.createElement("span");
      node.className = className;
      node.dataset.dreamGenerated = "miku";
      node.setAttribute("aria-hidden", "true");
      node.innerHTML = html;
      if (prepend) parent.prepend(node);
      else parent.appendChild(node);
    }
    if (contentKey !== null && node.dataset.dreamContentKey !== String(contentKey)) {
      node.innerHTML = html;
      node.dataset.dreamContentKey = String(contentKey);
    }
    return node;
  };

  const decorateMikuSidebar = (home) => {
    const aside = document.querySelector("aside.app-shell-left-panel");
    if (!aside) return;
    aside.querySelectorAll(".dream-miku-progress-card").forEach((node) => node.remove());
    aside.classList.add("dream-miku-sidebar");
    const language = detectMikuLanguage();
    const copy = language === "zh"
      ? { subtitle: "Codex 主题界面" }
      : { subtitle: "Codex theme interface" };
    const root = document.documentElement;
    setStyleIfChanged(root, "--dream-skin-project-prefix", cssString(language === "zh" ? "选择项目 · " : "Choose project · "));
    setStyleIfChanged(root, "--dream-skin-project-label", cssString(language === "zh" ? "选择项目" : "Choose project"));

    const switchButton = aside.querySelector('button[aria-label^="Switch mode"]');
    if (switchButton) {
      switchButton.classList.add("dream-miku-mode-switch");
      ensureGenerated(
        switchButton,
        "dream-miku-sidebar-brand",
        `<strong>Miku Codex</strong><small>${copy.subtitle}</small>`,
        false,
        language,
      );
    }

    const searchButton = aside.querySelector('button[aria-label="Search"]');
    if (searchButton) {
      searchButton.classList.add("dream-miku-search");
      ensureGenerated(searchButton, "dream-miku-control-icon", mikuIcon("search"));
    }

    const navItems = [
      { key: "new-task", match: /^New task\b|^新建任务/, icon: "plus" },
      { key: "scheduled", match: /^Scheduled\b|^已安排/, icon: "calendar" },
      { key: "plugins", match: /^Plugins\b|^Skills\b|^插件|^技能/, icon: "cube" },
      { key: "pull-requests", match: /^Pull requests\b|^拉取请求/, icon: "branch" },
      { key: "chat", match: /^Chat\b|^聊天/, icon: "chat" },
    ];
    for (const button of aside.querySelectorAll("button")) {
      let item = navItems.find((candidate) => candidate.key === button.dataset.dreamMikuNav);
      if (!item) item = navItems.find((candidate) => candidate.match.test(navigationLabel(button)));
      if (!item) continue;
      button.dataset.dreamMikuNav = item.key;
      if (item.key === "new-task" && home) button.dataset.dreamMikuSelected = "true";
      else delete button.dataset.dreamMikuSelected;
      button.classList.add("dream-miku-nav-item");
      ensureGenerated(button, "dream-miku-nav-icon", mikuIcon(item.icon));
      for (const child of [...button.children]) {
        if (child.classList?.contains("dream-miku-nav-label")) child.remove();
      }
    }

    for (const button of aside.querySelectorAll('button[role="button"]')) {
      const nativeLabel = navigationLabel(button);
      const sectionHint = button.dataset.dreamMikuSection || nativeLabel.toLowerCase();
      const isProjects = sectionHint === "projects" || nativeLabel === "项目";
      const isTasks = sectionHint === "tasks" || nativeLabel === "任务";
      if (!isProjects && !isTasks) continue;
      const section = isProjects ? "projects" : "tasks";
      button.dataset.dreamMikuSection = section;
      button.classList.add("dream-miku-section-title");
      ensureGenerated(button, "dream-miku-section-sparkle", mikuIcon("sparkle"));
      ensureGenerated(button, "dream-miku-section-label", nativeLabel, false, nativeLabel);
    }

    const projectIcons = ["planet", "music", "star", "image", "shirt", "heart"];
    [...aside.querySelectorAll("[data-app-action-sidebar-project-row]")].forEach((row, index) => {
      const label = row.getAttribute("data-app-action-sidebar-project-label") || row.getAttribute("aria-label") || "";
      let icon = projectIcons[index % projectIcons.length];
      if (/miku|codex-dream/i.test(label)) icon = "planet";
      else if (/music|song|audio|voice/i.test(label)) icon = "music";
      else if (/research|paper|doc/i.test(label)) icon = "star";
      else if (/image|portrait|vision|photo/i.test(label)) icon = "image";
      row.classList.add("dream-miku-project-row");
      row.dataset.dreamMikuProjectIcon = icon;
      const nativeIcon = row.querySelector('[data-sidebar-project-drop-zone="project-icon"]');
      if (nativeIcon) {
        nativeIcon.classList.add("dream-miku-project-icon-host");
        ensureGenerated(nativeIcon, "dream-miku-project-icon", mikuIcon(icon));
      }
    });

    for (const row of aside.querySelectorAll("[data-app-action-sidebar-thread-row]")) {
      row.classList.add("dream-miku-task-row");
      ensureGenerated(row, "dream-miku-task-icon", mikuIcon("check"), true);
    }

    const profile = aside.querySelector('button[aria-label="Open profile menu"]');
    if (profile) {
      profile.classList.add("dream-miku-profile");
      ensureGenerated(profile, "dream-miku-profile-avatar", "");
      ensureGenerated(profile, "dream-miku-profile-badge", "Future Star");
      concealNativeProfileAvatar(profile);
    }
  };

  const decorateMikuHome = (home) => {
    if (!home) return;
    if (home.scrollTop !== 0) home.scrollTop = 0;
    const hero = home.firstElementChild?.firstElementChild?.firstElementChild;
    if (!hero) return;
    hero.classList.add("dream-miku-hero-panel");
    const language = detectMikuLanguage();
    const heading = home.querySelector('[data-feature="game-source"]');
    const headingText = nativeText(heading) || (language === "zh" ? "今天想构建什么？" : "What should we build?");
    const copy = language === "zh"
      ? {
        header: "Miku Codex 主题",
        subtitle: "使用 Codex 的系统语言与字体",
        tagline: "和 Miku 一起，把灵感写成代码",
        speech: "一起创造吧！",
        theme: "Miku Codex 主题",
        themeId: "Theme ID: MIKU_3939 ♡",
      }
      : {
        header: "Miku Codex Theme",
        subtitle: "Using Codex system language and typography",
        tagline: "Build ideas into code with Miku",
        speech: "Let's create!",
        theme: "Miku Codex Theme",
        themeId: "Theme ID: MIKU_3939 ♡",
      };
    const root = document.documentElement;
    setStyleIfChanged(root, "--dream-skin-tagline", cssString(copy.tagline));
    setStyleIfChanged(root, "--dream-skin-project-prefix", cssString(language === "zh" ? "选择项目 · " : "Choose project · "));
    setStyleIfChanged(root, "--dream-skin-project-label", cssString(language === "zh" ? "选择项目" : "Choose project"));

    ensureGenerated(
      hero,
      "dream-miku-hero-header",
      `<span class="dream-miku-header-star">${mikuIcon("star")}</span>
       <span class="dream-miku-header-copy"><strong>${escapeHtml(copy.header)} ${mikuIcon("music")}</strong><small>${escapeHtml(copy.subtitle)} <i>♥</i></small></span>
       <span class="dream-miku-header-doodle"><i></i><b>♡</b><i></i></span>
       <span class="dream-miku-header-badge"><b>MIKU</b><i></i><em>♡</em></span>`,
      false,
      `${language}:${copy.header}`,
    );

    ensureGenerated(
      hero,
      "dream-miku-art-stage",
      `<span class="dream-miku-art-image"></span>
       <span class="dream-miku-signature">Miku <i>♡</i></span>
       <span class="dream-miku-hero-copy"><strong>${escapeHtml(headingText)} ${mikuIcon("star")}</strong><small>${escapeHtml(copy.tagline)} ${mikuIcon("music")}</small></span>
       <span class="dream-miku-speech">${escapeHtml(copy.speech)} <i>✧</i></span>
       <span class="dream-miku-exclusive"><b>MIKU</b><small>EXCLUSIVE</small><i>♥</i></span>
       <span class="dream-miku-theme-id"><b>${escapeHtml(copy.theme)}</b><small>${escapeHtml(copy.themeId)}</small></span>`,
      false,
      `${language}:${headingText}`,
    );
    if (characterUrl) {
      ensureGenerated(hero, "dream-miku-character-back", "");
      ensureGenerated(hero, "dream-miku-character-front", "");
    }

    const fallbackLabels = language === "zh"
      ? ["探索并理解代码", "构建新功能、应用或工具", "审查代码并提出修改建议", "修复问题和失败"]
      : [
        "Explore and understand code",
        "Build a new feature, app, or tool",
        "Review code and suggest changes",
        "Fix issues and failures",
      ];
    const nativeSuggestions = [...home.querySelectorAll(".group\\/home-suggestions")]
      .find((node) => !node.classList.contains("dream-miku-card-grid-generated"));
    const nativeButtons = nativeSuggestions
      ? [...nativeSuggestions.querySelectorAll("button")].slice(0, 4)
      : [];
    const labels = fallbackLabels.map((fallback, index) => nativeText(nativeButtons[index]) || fallback);
    if (nativeSuggestions) nativeSuggestions.classList.add("dream-miku-native-suggestions-source");

    let suggestions = [...hero.children]
      .find((node) => node.classList?.contains("dream-miku-card-grid-generated"));
    if (!suggestions) {
      suggestions = document.createElement("div");
      suggestions.className = "group/home-suggestions dream-miku-card-grid dream-miku-card-grid-generated";
      suggestions.dataset.dreamGenerated = "miku";
      suggestions.setAttribute("aria-label", language === "zh" ? "任务建议" : "Task suggestions");
      for (let index = 0; index < labels.length; index += 1) {
        const label = labels[index];
        const button = document.createElement("button");
        button.type = "button";
        button.className = "dream-miku-generated-card";
        button.setAttribute("aria-label", label);
        button.innerHTML = `<span class="dream-miku-native-card-label">${escapeHtml(label)}</span>`;
        suggestions.appendChild(button);
      }
      hero.appendChild(suggestions);
    }
    [...suggestions.querySelectorAll("button")].slice(0, 4).forEach((button, index) => {
      const label = labels[index];
      button.setAttribute("aria-label", label);
      const nativeLabel = button.querySelector(".dream-miku-native-card-label");
      if (nativeLabel) nativeLabel.textContent = label;
      button.onclick = () => {
        if (nativeButtons[index]?.isConnected) nativeButtons[index].click();
        else putTextInComposer(label);
      };
    });
    const cardIcons = ["code", "puzzle", "clipboard", "tools"];
    if (suggestions) {
      suggestions.classList.add("dream-miku-card-grid");
      [...suggestions.querySelectorAll("button")].slice(0, 4).forEach((button, index) => {
        const icon = cardIcons[index];
        if (!icon) return;
        const label = nativeText(button);
        button.classList.add("dream-miku-card");
        button.dataset.dreamMikuCard = String(index + 1);
        ensureGenerated(
          button,
          "dream-miku-card-content",
          `<span class="dream-miku-card-icon">${mikuIcon(icon)}</span>
           <strong></strong>
           <span class="dream-miku-card-notes">${index === 0 ? "✦ ♫" : index === 1 ? "✧ ♡" : index === 2 ? "⌁ ✧" : "☆ ♡"}</span>
           <span class="dream-miku-card-heart">♥</span>`,
          false,
          `${index}:${label}`,
        );
        const generatedLabel = button.querySelector(".dream-miku-card-content strong");
        if (generatedLabel) generatedLabel.textContent = label;
      });
    }
  };

  const decorateMikuComposer = (home) => {
    const composer = document.querySelector(".composer-surface-chrome");
    if (!composer) return;
    composer.classList.add("dream-miku-composer");
    const editable = composer.querySelector('[contenteditable="true"]');
    const placeholder = editable?.querySelector("[data-placeholder]");
    if (placeholder?.dataset.dreamOriginalPlaceholder) {
      placeholder.setAttribute("data-placeholder", placeholder.dataset.dreamOriginalPlaceholder);
      delete placeholder.dataset.dreamOriginalPlaceholder;
    }
    composer.querySelector(".dream-miku-composer-placeholder")?.remove();
    ensureGenerated(
      composer,
      "dream-miku-composer-wave",
      `<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>`,
    );
    ensureGenerated(composer, "dream-miku-composer-sparkles", "✧　☆　♫");

    for (const button of composer.querySelectorAll("button")) {
      const aria = button.getAttribute("aria-label") || "";
      const testId = button.getAttribute("data-testid") || "";
      const isPrimaryButton = button.matches?.('[class~="bg-token-foreground"]');
      const isComposerAction = /^(Send|Submit|Stop|Pause)$/.test(aria) ||
        isPrimaryButton || /(?:stop|pause)/i.test(testId);
      if (!isComposerAction && button.classList.contains("dream-miku-composer-send")) {
        button.classList.remove("dream-miku-composer-send", "dream-miku-composer-stop");
        delete button.dataset.dreamMikuComposerAction;
        button.querySelector(":scope > .dream-miku-control-icon")?.remove();
      }
      if (aria === "Add files and more") {
        button.classList.add("dream-miku-composer-add");
        ensureGenerated(button, "dream-miku-control-icon", mikuIcon("plus"));
      } else if (aria === "Dictate") {
        button.classList.add("dream-miku-composer-mic");
        ensureGenerated(button, "dream-miku-control-icon", mikuIcon("microphone"));
      } else if (isComposerAction) {
        const isStopping = /^(Stop|Pause)$/.test(aria) || /(?:stop|pause)/i.test(testId);
        const action = isStopping ? (aria === "Pause" ? "pause" : "stop") : "send";
        button.classList.add("dream-miku-composer-send");
        button.classList.toggle("dream-miku-composer-stop", isStopping);
        button.dataset.dreamMikuComposerAction = action;
        ensureGenerated(button, "dream-miku-control-icon", mikuIcon(action), false, action);
      } else if (compactText(button).includes("Full access")) {
        button.classList.add("dream-miku-access-button");
        ensureGenerated(button, "dream-miku-access-icon", mikuIcon("lock"), true);
      } else if (/\b\d+\.\d+\b|Sol|Luna/.test(compactText(button))) {
        button.classList.add("dream-miku-model-button");
      }
    }

    if (home) {
      const projectSelector = [...home.querySelectorAll("*")]
        .find((node) => node.classList?.contains("group/project-selector"));
      if (projectSelector) {
        projectSelector.classList.add("dream-miku-project-selector");
        ensureGenerated(projectSelector, "dream-miku-project-selector-icon", mikuIcon("folder"), true);
      }
    }
  };

  const decorateMikuSettings = () => {
    const root = document.documentElement;
    const settingsSurface = document.querySelector("div.main-surface");
    const settingsSidebar = document.querySelector("div.app-shell-left-panel");
    const settingsActive = Boolean(settingsSurface && settingsSidebar);

    if (!settingsActive) {
      root?.removeAttribute(SETTINGS_ATTR);
      document.querySelectorAll(".dream-miku-settings-surface").forEach((node) => {
        node.classList.remove("dream-miku-settings-surface");
      });
      document.querySelectorAll(".dream-miku-settings-sidebar").forEach((node) => {
        node.classList.remove("dream-miku-settings-sidebar");
      });
      document.querySelectorAll(".dream-miku-settings-card").forEach((node) => {
        node.classList.remove("dream-miku-settings-card");
      });
      document.querySelectorAll("input.dream-miku-native-pet-size").forEach((node) => {
        node.classList.remove("dream-miku-native-pet-size");
      });
      return null;
    }

    root.setAttribute(SETTINGS_ATTR, "true");
    settingsSurface.classList.add("dream-miku-settings-surface");
    settingsSidebar.classList.add("dream-miku-settings-sidebar");
    settingsSurface.querySelector("#dream-miku-pet-size")?.closest("section")?.remove();
    settingsSurface.querySelectorAll('[class~="rounded-2xl"][class~="border"]').forEach((node) => {
      node.classList.add("dream-miku-settings-card");
    });

    const nativePetSize = settingsSurface.querySelector('input#pet-size[type="range"]');
    nativePetSize?.classList.add("dream-miku-native-pet-size");
    return settingsSurface;
  };

  const isVisibleModule = (node) => {
    if (!node) return false;
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 &&
      rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight &&
      style.display !== "none" && style.visibility !== "hidden" &&
      Number(style.opacity || 1) > 0;
  };

  const hasOpenAuxiliaryModule = () => {
    const moduleToggle = [...document.querySelectorAll('button[aria-pressed="true"]')]
      .some((button) => /(?:pinned summary|bottom panel|side panel|固定摘要|底部面板|侧边面板)/i
        .test(button.getAttribute("aria-label") || ""));
    const floatingSummary = [...document.querySelectorAll(
      'main.main-surface [class~="rounded-3xl"][class~="bg-token-dropdown-background"][class~="pt-2.5"]'
    )].some(isVisibleModule);
    return moduleToggle || floatingSummary;
  };

  const PET_ROWS = {
    idle: { row: 0, frames: 6, durations: [280, 110, 110, 140, 140, 320] },
    "running-right": { row: 1, frames: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
    "running-left": { row: 2, frames: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
    waving: { row: 3, frames: 4, durations: [140, 140, 140, 280] },
    jumping: { row: 4, frames: 5, durations: [140, 140, 140, 140, 280] },
    failed: { row: 5, frames: 8, durations: [140, 140, 140, 140, 140, 140, 140, 240] },
    waiting: { row: 6, frames: 6, durations: [150, 150, 150, 150, 150, 260] },
    running: { row: 7, frames: 6, durations: [220, 170, 180, 220, 220, 420] },
    review: { row: 8, frames: 6, durations: [150, 150, 150, 150, 150, 280] },
  };
  const PET_CONFIG = THEME.pet && typeof THEME.pet === "object" ? THEME.pet : null;
  const nativePetOverlay = PET_CONFIG?.replaceNativeOverlay === false;
  let petController = null;

  const clampNumber = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, Number(value) || 0));

  const readPetPosition = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(PET_POSITION_KEY) || "null");
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        return { x: clampNumber(saved.x, 0, 1), y: clampNumber(saved.y, 0, 1) };
      }
    } catch {}
    return { x: 1, y: 1 };
  };

  const writePetPosition = (position) => {
    try {
      localStorage.setItem(PET_POSITION_KEY, JSON.stringify({
        x: Number(position.x.toFixed(4)),
        y: Number(position.y.toFixed(4)),
      }));
    } catch {}
  };

  const petIsVisible = (node) => {
    if (!node) return false;
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" &&
      Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
  };

  const createPetController = (node, host) => {
    const sprite = node.querySelector(".dream-miku-window-pet-sprite");
    const position = readPetPosition();
    const controller = {
      node,
      host,
      state: "idle",
      frame: 0,
      visible: false,
      dragging: false,
      destroyed: false,
      animationTimer: null,
      stateTimer: null,
      runningMissingSince: 0,
      position,
      pointer: null,
      moveFrame: null,
      paint() {
        const spec = PET_ROWS[this.state] || PET_ROWS.idle;
        const column = Math.min(this.frame, spec.frames - 1);
        const x = -column * (100 / 8);
        const y = -spec.row * (100 / 11);
        setStyleIfChanged(sprite, "transform", `translate3d(${x}%, ${y}%, 0)`);
      },
      setState(nextState) {
        if (this.destroyed) return;
        const next = PET_ROWS[nextState] ? nextState : "idle";
        if (this.state === next) return;
        this.state = next;
        this.frame = 0;
        node.dataset.dreamPetState = next;
        this.paint();
        if (this.visible) this.scheduleFrame();
      },
      scheduleFrame() {
        if (this.destroyed) return;
        if (this.animationTimer) clearTimeout(this.animationTimer);
        const spec = PET_ROWS[this.state] || PET_ROWS.idle;
        const delay = spec.durations[this.frame] || 180;
        this.animationTimer = setTimeout(() => {
          this.animationTimer = null;
          if (this.destroyed) return;
          if (this.visible && !document.hidden) {
            this.frame = (this.frame + 1) % spec.frames;
            this.paint();
          }
          this.scheduleFrame();
        }, document.hidden ? 1000 : delay);
      },
      detectState() {
        if (this.destroyed || this.dragging || !this.visible) return;
        const visibleNode = (selector) => {
          const candidate = document.querySelector(selector);
          return candidate && petIsVisible(candidate);
        };
        const runningSignal = visibleNode([
          '.composer-surface-chrome .dream-miku-composer-stop',
          '.composer-surface-chrome [data-dream-miku-composer-action="stop"]',
          '.composer-surface-chrome [data-dream-miku-composer-action="pause"]',
          '.composer-surface-chrome button[aria-label*="Stop" i]',
          '.composer-surface-chrome button[aria-label*="Pause" i]',
          '.composer-surface-chrome [data-testid*="stop" i]',
          '.composer-surface-chrome [data-testid*="pause" i]',
        ].join(", "));
        if (runningSignal) {
          this.runningMissingSince = 0;
          this.setState("running");
        } else if (visibleNode('main.main-surface .codex-review-diff-card, main.main-surface .cm-editor')) {
          this.runningMissingSince = 0;
          this.setState("review");
        } else if (visibleNode('[data-testid*="approval" i][data-state="open"], [data-testid*="approval" i][data-state="pending"]')) {
          this.runningMissingSince = 0;
          this.setState("waiting");
        } else if (this.state !== "waving" && this.state !== "jumping") {
          if (this.state === "running") {
            if (!this.runningMissingSince) this.runningMissingSince = performance.now();
            if (performance.now() - this.runningMissingSince < 1600) return;
          }
          this.runningMissingSince = 0;
          this.setState("idle");
        }
      },
      startStateTimer() {
        if (this.destroyed || this.stateTimer) return;
        this.stateTimer = setInterval(() => this.detectState(), 700);
      },
      stopStateTimer() {
        if (this.stateTimer) clearInterval(this.stateTimer);
        this.stateTimer = null;
      },
      stopAnimation() {
        if (this.animationTimer) clearTimeout(this.animationTimer);
        this.animationTimer = null;
      },
      applyPosition() {
        const hostWidth = host.clientWidth || host.getBoundingClientRect().width;
        const hostHeight = host.clientHeight || host.getBoundingClientRect().height;
        const petWidth = node.offsetWidth || Number(PET_CONFIG?.size) || 128;
        const petHeight = node.offsetHeight || petWidth * (208 / 192);
        const margin = 16;
        const maxLeft = Math.max(margin, hostWidth - petWidth - margin);
        const maxTop = Math.max(margin, hostHeight - petHeight - margin);
        const left = margin + clampNumber(this.position.x, 0, 1) * Math.max(0, maxLeft - margin);
        const top = margin + clampNumber(this.position.y, 0, 1) * Math.max(0, maxTop - margin);
        node.style.left = `${Math.round(left)}px`;
        node.style.top = `${Math.round(top)}px`;
      },
      savePosition() {
        const hostRect = host.getBoundingClientRect();
        const petRect = node.getBoundingClientRect();
        const margin = 16;
        const maxLeft = Math.max(margin, hostRect.width - petRect.width - margin);
        const maxTop = Math.max(margin, hostRect.height - petRect.height - margin);
        this.position = {
          x: clampNumber((petRect.left - hostRect.left - margin) / Math.max(1, maxLeft - margin), 0, 1),
          y: clampNumber((petRect.top - hostRect.top - margin) / Math.max(1, maxTop - margin), 0, 1),
        };
        writePetPosition(this.position);
      },
      setVisible(nextVisible) {
        const visible = Boolean(nextVisible);
        if (this.destroyed || this.visible === visible) return;
        this.visible = visible;
        node.classList.toggle("dream-miku-window-pet-hidden", !this.visible);
        updateBubble(this);
        if (this.visible) {
          this.applyPosition();
          this.detectState();
          this.startStateTimer();
          if (!this.animationTimer) this.scheduleFrame();
        } else {
          this.stopAnimation();
          this.stopStateTimer();
        }
      },
      resetPosition() {
        this.position = { x: 1, y: 1 };
        writePetPosition(this.position);
        this.applyPosition();
      },
      onPointerDown(event) {
        if (!this.visible || event.button !== 0) return;
        const rect = node.getBoundingClientRect();
        this.pointer = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startLeft: rect.left,
          startTop: rect.top,
          moved: false,
        };
        this.dragging = true;
        node.dataset.dreamPetDragging = "true";
        node.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      },
      onPointerMove(event) {
        if (!this.pointer || event.pointerId !== this.pointer.id) return;
        const dx = event.clientX - this.pointer.startX;
        const dy = event.clientY - this.pointer.startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this.pointer.moved = true;
        if (this.pointer.moved) this.setState(dx >= 0 ? "running-right" : "running-left");
        this.pointer.latestX = event.clientX;
        this.pointer.latestY = event.clientY;
        if (this.moveFrame) return;
        this.moveFrame = requestAnimationFrame(() => {
          this.moveFrame = null;
          if (!this.pointer) return;
          const hostRect = host.getBoundingClientRect();
          const petRect = node.getBoundingClientRect();
          const margin = 16;
          const left = clampNumber(
            this.pointer.startLeft + (this.pointer.latestX - this.pointer.startX) - hostRect.left,
            margin,
            Math.max(margin, hostRect.width - petRect.width - margin),
          );
          const top = clampNumber(
            this.pointer.startTop + (this.pointer.latestY - this.pointer.startY) - hostRect.top,
            margin,
            Math.max(margin, hostRect.height - petRect.height - margin),
          );
          node.style.left = `${Math.round(left)}px`;
          node.style.top = `${Math.round(top)}px`;
        });
      },
      onPointerUp(event) {
        if (!this.pointer || event.pointerId !== this.pointer.id) return;
        node.releasePointerCapture?.(event.pointerId);
        const moved = this.pointer.moved;
        this.pointer = null;
        this.dragging = false;
        delete node.dataset.dreamPetDragging;
        if (this.moveFrame) cancelAnimationFrame(this.moveFrame);
        this.moveFrame = null;
        this.savePosition();
        if (moved) this.setState("idle");
        else {
          this.setState("waving");
          setTimeout(() => {
            if (!this.dragging && this.state === "waving") this.setState("idle");
          }, 700);
        }
      },
      onKeyDown(event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        this.setState("waving");
        setTimeout(() => {
          if (!this.dragging && this.state === "waving") this.setState("idle");
        }, 700);
      },
      destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.stopAnimation();
        this.stopStateTimer();
        if (this.moveFrame) cancelAnimationFrame(this.moveFrame);
        node.removeEventListener("pointerdown", this.onPointerDown);
        node.removeEventListener("pointermove", this.onPointerMove);
        node.removeEventListener("pointerup", this.onPointerUp);
        node.removeEventListener("pointercancel", this.onPointerUp);
        node.removeEventListener("keydown", this.onKeyDown);
        node.removeEventListener("dblclick", this.resetPosition);
        window[PET_CONTROLLERS_KEY]?.delete?.(this);
      },
    };
    controller.paint();
    controller.onPointerDown = controller.onPointerDown.bind(controller);
    controller.onPointerMove = controller.onPointerMove.bind(controller);
    controller.onPointerUp = controller.onPointerUp.bind(controller);
    controller.onKeyDown = controller.onKeyDown.bind(controller);
    controller.resetPosition = controller.resetPosition.bind(controller);
    node.addEventListener("pointerdown", controller.onPointerDown, { passive: false });
    node.addEventListener("pointermove", controller.onPointerMove, { passive: true });
    node.addEventListener("pointerup", controller.onPointerUp, { passive: true });
    node.addEventListener("pointercancel", controller.onPointerUp, { passive: true });
    node.addEventListener("keydown", controller.onKeyDown);
    node.addEventListener("dblclick", controller.resetPosition);
    window[PET_CONTROLLERS_KEY].add(controller);
    return controller;
  };

  const ensureMikuWindowPet = (chrome, shouldShow) => {
    if (!petUrl || !PET_CONFIG || nativePetOverlay || (THEME.preset || "classic") !== "miku-pastel") {
      petController?.destroy?.();
      petController = null;
      chrome.querySelector(".dream-miku-window-pet")?.remove();
      if (window[STATE_KEY]) window[STATE_KEY].petController = null;
      return null;
    }
    let node = chrome.querySelector(".dream-miku-window-pet");
    if (node && !node.querySelector(".dream-miku-window-pet-viewport")) {
      petController?.destroy?.();
      petController = null;
      node.remove();
      node = null;
    }
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "dream-miku-window-pet";
      node.dataset.dreamGenerated = "miku";
      node.dataset.dreamPetState = "idle";
      node.setAttribute("aria-label", "Miku Future pet");
      node.innerHTML = `<span class="dream-miku-window-pet-viewport" aria-hidden="true"><span class="dream-miku-window-pet-sprite"></span></span>`;
      chrome.appendChild(node);
    }
    if (!petController || petController.node !== node) {
      petController?.destroy?.();
      petController = createPetController(node, chrome);
    }
    petController.setVisible(shouldShow);
    if (window[STATE_KEY]) window[STATE_KEY].petController = petController;
    return petController;
  };

  const metrics = {
    ensureRuns: 0,
    observerBatches: 0,
    relevantMutations: 0,
    ignoredMutations: 0,
  };

  const cleanupMikuDecorations = () => {
    petController?.destroy?.();
    petController = null;
    if (window[STATE_KEY]) window[STATE_KEY].petController = null;
    for (const placeholder of document.querySelectorAll("[data-dream-original-placeholder]")) {
      placeholder.setAttribute("data-placeholder", placeholder.dataset.dreamOriginalPlaceholder || "");
      delete placeholder.dataset.dreamOriginalPlaceholder;
    }
    document.querySelectorAll('[data-dream-generated="miku"]').forEach((node) => node.remove());
    const classes = [
      "dream-miku-sidebar", "dream-miku-mode-switch", "dream-miku-search",
      "dream-miku-nav-item", "dream-miku-section-title", "dream-miku-project-row",
      "dream-miku-project-icon-host", "dream-miku-task-row", "dream-miku-profile",
      "dream-miku-native-profile-avatar",
      "dream-miku-hero-panel", "dream-miku-card-grid", "dream-miku-card",
      "dream-miku-native-suggestions-source",
      "dream-miku-composer", "dream-miku-composer-add", "dream-miku-composer-mic",
      "dream-miku-composer-send", "dream-miku-access-button", "dream-miku-model-button",
      "dream-miku-project-selector", "dream-miku-settings-surface",
      "dream-miku-settings-sidebar", "dream-miku-settings-card",
    ];
    for (const className of classes) {
      document.querySelectorAll(`.${className}`).forEach((node) => node.classList.remove(className));
    }
    document.querySelectorAll("[data-dream-miku-nav]").forEach((node) => delete node.dataset.dreamMikuNav);
    document.querySelectorAll("[data-dream-miku-selected]").forEach((node) => delete node.dataset.dreamMikuSelected);
    document.querySelectorAll("[data-dream-miku-section]").forEach((node) => delete node.dataset.dreamMikuSection);
    document.querySelectorAll("[data-dream-miku-project-icon]").forEach((node) => delete node.dataset.dreamMikuProjectIcon);
    document.querySelectorAll("[data-dream-miku-card]").forEach((node) => delete node.dataset.dreamMikuCard);
    document.documentElement?.removeAttribute(SETTINGS_ATTR);
    document.documentElement?.removeAttribute(MODULE_ATTR);
  };

  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle) {
    existingStyle.textContent = cssText;
    existingStyle.dataset.dreamSkinVersion = VERSION;
    existingStyle.dataset.dreamSkinStyleRevision = STYLE_REVISION;
  }

  const ensure = () => {
    if (window[DISABLED_KEY]) return;
    metrics.ensureRuns += 1;
    const root = document.documentElement;
    if (!root) return;
    const shell = detectShellMode();
    root.classList.add("codex-dream-skin");
    setAttributeIfChanged(root, SHELL_ATTR, shell);
    setAttributeIfChanged(root, PRESET_ATTR, THEME.preset || "classic");
    if (artUrl) setStyleIfChanged(root, "--dream-skin-art", `url("${artUrl}")`);
    if (sceneUrl) setStyleIfChanged(root, "--dream-skin-scene", `url("${sceneUrl}")`);
    else removeStyleIfPresent(root, "--dream-skin-scene");
    if (characterUrl) setStyleIfChanged(root, "--dream-skin-character", `url("${characterUrl}")`);
    else removeStyleIfPresent(root, "--dream-skin-character");
    if (petUrl) setStyleIfChanged(root, "--dream-miku-pet-image", `url("${petUrl}")`);
    else removeStyleIfPresent(root, "--dream-miku-pet-image");
    applyTheme(root, shell);

    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || root).appendChild(style);
    }
    if (style.dataset.dreamSkinVersion !== VERSION ||
        style.dataset.dreamSkinStyleRevision !== STYLE_REVISION) {
      style.textContent = cssText;
      style.dataset.dreamSkinVersion = VERSION;
      style.dataset.dreamSkinStyleRevision = STYLE_REVISION;
    }

    const settingsSurface = (THEME.preset || "classic") === "miku-pastel"
      ? decorateMikuSettings()
      : null;
    const shellMain = document.querySelector("main.main-surface") ||
      settingsSurface ||
      document.querySelector("main");
    const homeIndicator = document.querySelector('[data-testid="home-icon"]');
    const home = homeIndicator?.closest('[role="main"]') ||
      [...document.querySelectorAll('[role="main"]')].find((candidate) =>
        candidate.querySelector('[data-feature="game-source"]') &&
        candidate.querySelector('.group\\\\/home-suggestions')) || null;
    for (const candidate of document.querySelectorAll('[role="main"].dream-skin-home')) {
      if (candidate !== home) candidate.classList.remove("dream-skin-home");
    }
    if (home) home.classList.add("dream-skin-home");
    const moduleOpen = !home && !settingsSurface && hasOpenAuxiliaryModule();
    setAttributeIfChanged(root, MODULE_ATTR, moduleOpen ? "true" : "false");
    if ((THEME.preset || "classic") === "miku-pastel") {
      decorateMikuSidebar(home);
      decorateMikuHome(home);
      decorateMikuComposer(home);
    } else {
      cleanupMikuDecorations();
    }

    if (!shellMain || !document.body) return;
    shellMain.classList.toggle("dream-skin-home-shell", Boolean(home));
    let chrome = document.getElementById(CHROME_ID);
    if (!chrome || chrome.parentElement !== document.body) {
      chrome?.remove();
      chrome = document.createElement("div");
      chrome.id = CHROME_ID;
      chrome.innerHTML = `
        <div class="dream-skin-brand" aria-hidden="true">
          <span class="dream-skin-portal-mark">◉</span>
          <span><b></b><small></small></span>
        </div>
        <div class="dream-skin-status" aria-hidden="true"><i></i><span></span></div>
        <div class="dream-skin-quote" aria-hidden="true"></div>
        <div class="dream-skin-particles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="dream-skin-orbit" aria-hidden="true"></div>`;
      document.body.appendChild(chrome);
    }
    chrome.removeAttribute("aria-hidden");
    setTextIfChanged(chrome.querySelector(".dream-skin-brand b"), THEME.name || "Codex Dream Skin");
    setTextIfChanged(chrome.querySelector(".dream-skin-brand small"), THEME.brandSubtitle || "CODEX DREAM SKIN");
    setTextIfChanged(chrome.querySelector(".dream-skin-status span"), THEME.statusText || "DREAM SKIN ONLINE");
    setTextIfChanged(chrome.querySelector(".dream-skin-quote"), THEME.quote || "MAKE SOMETHING WONDERFUL");
    if ((THEME.preset || "classic") === "miku-pastel" && !petUrl) {
      ensureGenerated(chrome.querySelector(".dream-skin-orbit"), "dream-miku-polaroid-clip", mikuIcon("paperclip"));
    }
    const shellBox = shellMain.getBoundingClientRect();
    setStyleIfChanged(chrome, "left", `${Math.round(shellBox.left)}px`);
    setStyleIfChanged(chrome, "top", `${Math.round(shellBox.top)}px`);
    setStyleIfChanged(chrome, "width", `${Math.round(shellBox.width)}px`);
    setStyleIfChanged(chrome, "height", `${Math.round(shellBox.height)}px`);
    chrome.classList.toggle("dream-skin-home-shell", Boolean(home));
    chrome.classList.toggle("dream-miku-module-open", moduleOpen);
    // The orbit is only a fallback for themes with no pet asset. Miku ships a
    // pet asset even when Codex renders its native pet overlay, so never let
    // the obsolete polaroid fall back into a settings page corner.
    chrome.classList.toggle(
      "dream-miku-pet-present",
      (THEME.preset || "classic") === "miku-pastel" && Boolean(petUrl),
    );
    if (chrome.dataset.dreamShell !== shell) chrome.dataset.dreamShell = shell;
    // New chat and settings keep the transparent Pet visible. Expanded
    // auxiliary modules still hide it because those surfaces have controls
    // that the Pet could cover.
    const shouldShowPet = Boolean(petUrl && !nativePetOverlay && !moduleOpen);
    const pet = ensureMikuWindowPet(chrome, shouldShowPet);
    if (pet && shouldShowPet) pet.applyPosition();
  };

  const cleanup = () => {
    window[DISABLED_KEY] = true;
    document.documentElement?.classList.remove("codex-dream-skin");
    document.documentElement?.removeAttribute(SHELL_ATTR);
    document.documentElement?.removeAttribute(PRESET_ATTR);
    document.documentElement?.removeAttribute(SETTINGS_ATTR);
    document.documentElement?.removeAttribute(MODULE_ATTR);
    document.documentElement?.style.removeProperty("--dream-skin-art");
    document.documentElement?.style.removeProperty("--dream-skin-scene");
    document.documentElement?.style.removeProperty("--dream-skin-character");
    document.documentElement?.style.removeProperty("--dream-miku-pet-image");
    document.documentElement?.removeAttribute("data-dream-card-icons");
    for (let index = 1; index <= 4; index += 1) {
      document.documentElement?.style.removeProperty(`--dream-miku-card-icon-${index}`);
    }
    for (const name of THEME_VARIABLES) document.documentElement?.style.removeProperty(name);
    cleanupMikuDecorations();
    document.querySelectorAll(".dream-skin-home").forEach((node) => node.classList.remove("dream-skin-home"));
    document.querySelectorAll(".dream-skin-home-shell").forEach((node) => node.classList.remove("dream-skin-home-shell"));
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(CHROME_ID)?.remove();
    const state = window[STATE_KEY];
    state?.observer?.disconnect();
    if (state?.timer) clearInterval(state.timer);
    if (state?.scheduler?.timeout) clearTimeout(state.scheduler.timeout);
    if (state?.resizeHandler) window.removeEventListener("resize", state.resizeHandler);
    if (state?.mediaHandler && state?.mediaQuery) {
      try { state.mediaQuery.removeEventListener("change", state.mediaHandler); } catch {}
    }
    if (state?.artUrl) URL.revokeObjectURL(state.artUrl);
    if (state?.sceneUrl) URL.revokeObjectURL(state.sceneUrl);
    if (state?.characterUrl) URL.revokeObjectURL(state.characterUrl);
    if (state?.petUrl) URL.revokeObjectURL(state.petUrl);
    for (const url of state?.cardIconUrls || []) URL.revokeObjectURL(url);
    delete window[STATE_KEY];
    return true;
  };

  const scheduler = { timeout: null };
  let observer = null;
  const runEnsure = () => {
    if (window[DISABLED_KEY]) return;
    if (observer) observer.disconnect();
    try {
      ensure();
    } finally {
      if (observer) {
        observer.takeRecords();
        observer.observe(document.documentElement, observerOptions);
      }
    }
  };
  const scheduleEnsure = () => {
    if (scheduler.timeout) return;
    scheduler.timeout = setTimeout(() => {
      scheduler.timeout = null;
      runEnsure();
    }, 260);
  };
  const isGeneratedMutation = (node) => Boolean(
    node?.nodeType === 1 && node.closest?.(`#${CHROME_ID}, [data-dream-generated="miku"]`)
  );
  const MODULE_TOGGLE_SELECTOR = [
    'button[aria-label*="pinned summary" i]',
    'button[aria-label*="bottom panel" i]',
    'button[aria-label*="side panel" i]',
    'button[aria-label*="固定摘要" i]',
    'button[aria-label*="底部面板" i]',
    'button[aria-label*="侧边面板" i]',
  ].join(", ");
  const ROUTE_ANCHOR_SELECTOR = [
    "aside.app-shell-left-panel",
    "main.main-surface",
    '[role="main"]',
    ".composer-surface-chrome",
    '[data-testid="home-icon"]',
    "[data-app-action-sidebar-project-row]",
    "[data-app-action-sidebar-thread-row]",
    'main.main-surface [class~="rounded-3xl"][class~="bg-token-dropdown-background"][class~="pt-2.5"]',
  ].join(", ");
  const hasRelevantAddedNode = (mutation) => [...mutation.addedNodes, ...mutation.removedNodes].some((node) => {
    if (node.nodeType !== 1 || isGeneratedMutation(node)) return false;
    if (node.matches?.(`${ROUTE_ANCHOR_SELECTOR}, ${MODULE_TOGGLE_SELECTOR}`)) return true;
    return Boolean(node.querySelector?.(`${ROUTE_ANCHOR_SELECTOR}, ${MODULE_TOGGLE_SELECTOR}`));
  });
  const isRelevantMutation = (mutation) => {
    const target = mutation.target?.nodeType === 1
      ? mutation.target
      : mutation.target?.parentElement;
    if (!target || isGeneratedMutation(target)) return false;
    if (mutation.type === "attributes") {
      if (target === document.documentElement || target === document.body) {
        return ["class", "data-theme", "data-appearance", "data-color-mode"].includes(mutation.attributeName);
      }
      if (mutation.attributeName === "aria-pressed" || mutation.attributeName === "aria-expanded") {
        return Boolean(target.matches?.(MODULE_TOGGLE_SELECTOR));
      }
      if (mutation.attributeName === "aria-label") {
        return Boolean(
          target.matches?.("button") &&
          (target.classList.contains("dream-miku-composer-send") ||
            /^(Send|Submit|Stop|Pause)$/.test(target.getAttribute("aria-label") || "")) &&
          target.closest?.(".composer-surface-chrome"),
        );
      }
      if (mutation.attributeName === "data-testid") {
        return Boolean(
          target.matches?.("button") &&
          target.closest?.(".composer-surface-chrome") &&
          (target.classList.contains("dream-miku-composer-send") ||
            /(?:stop|pause)/i.test(target.getAttribute("data-testid") || "")),
        );
      }
      if (mutation.attributeName === "class") {
        return Boolean(target.matches?.("main.main-surface, aside.app-shell-left-panel, [role=\"main\"]"));
      }
      return false;
    }
    if (target.closest?.(".thread-scroll-container, [contenteditable=\"true\"]")) return false;
    if (target.closest?.(".composer-surface-chrome")) {
      return [...mutation.addedNodes, ...mutation.removedNodes].some((node) =>
        node.nodeType === 1 && (node.matches?.("button") || node.querySelector?.("button"))
      );
    }
    if (target.closest?.("aside.app-shell-left-panel")) {
      return hasRelevantAddedNode(mutation);
    }
    return hasRelevantAddedNode(mutation) || Boolean(target.matches?.("main.main-surface, [role=\"main\"]"));
  };
  const observerOptions = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "class", "data-theme", "data-appearance", "data-color-mode",
      "aria-pressed", "aria-expanded", "aria-label", "data-testid", "data-state",
    ],
  };
  observer = new MutationObserver((mutations) => {
    metrics.observerBatches += 1;
    let relevant = false;
    for (const mutation of mutations) {
      if (isRelevantMutation(mutation)) {
        metrics.relevantMutations += 1;
        relevant = true;
      } else {
        metrics.ignoredMutations += 1;
      }
    }
    if (relevant) scheduleEnsure();
  });
  observer.observe(document.documentElement, observerOptions);
  const timer = setInterval(runEnsure, 8000);
  const resizeHandler = scheduleEnsure;
  window.addEventListener("resize", resizeHandler, { passive: true });

  let mediaQuery = null;
  let mediaHandler = null;
  try {
    mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaHandler = () => scheduleEnsure();
    mediaQuery.addEventListener("change", mediaHandler);
  } catch {}

  window[STATE_KEY] = {
    ensure,
    cleanup,
    observer,
    runEnsure,
    timer,
    scheduler,
    resizeHandler,
    mediaQuery,
    mediaHandler,
    artUrl,
    sceneUrl,
    characterUrl,
    petUrl,
    petController,
    metrics,
    cardIconUrls,
    version: VERSION,
    themeId: THEME.id || "custom",
    revision: PAYLOAD_REVISION,
    preset: THEME.preset || "classic",
    nativePetOverlay,
    detectShellMode,
  };
  runEnsure();
  window[STATE_KEY].petController = petController;
  return {
    installed: true,
    version: VERSION,
    themeId: THEME.id || "custom",
    revision: PAYLOAD_REVISION,
    preset: THEME.preset || "classic",
    shell: detectShellMode(),
  };
})(__DREAM_SKIN_CSS_JSON__, __DREAM_SKIN_ART_JSON__, __DREAM_SKIN_SCENE_JSON__, __DREAM_SKIN_CHARACTER_JSON__, __DREAM_SKIN_CARD_ICONS_JSON__, __DREAM_SKIN_PET_JSON__, __DREAM_SKIN_THEME_JSON__)
