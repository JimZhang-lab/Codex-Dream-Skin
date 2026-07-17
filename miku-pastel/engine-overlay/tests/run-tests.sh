#!/bin/bash

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
NODE="${NODE:-/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node}"
[ -x "$NODE" ] || { printf 'Codex bundled Node.js was not found: %s\n' "$NODE" >&2; exit 1; }

while IFS= read -r file; do /bin/bash -n "$file"; done < <(
  /usr/bin/find "$ROOT" -type f \( -name '*.sh' -o -name '*.command' \) \
    ! -path '*/release/*' -print
)
while IFS= read -r file; do "$NODE" --check "$file" >/dev/null; done < <(
  /usr/bin/find "$ROOT/scripts" "$ROOT/assets" "$ROOT/tests" \
    -type f \( -name '*.mjs' -o -name '*.js' \) -print
)

if /usr/bin/grep -R -n -E 'dream-skin-skin|DREAM_SKIN_SKIN|1\.0\.0-rc2' \
  "$ROOT/scripts" "$ROOT/assets" >/dev/null; then
  printf 'Legacy release-candidate identifiers remain in runtime files.\n' >&2
  exit 1
fi
if /usr/bin/grep -R -n -E '(writeFile|rename|copyFile|rm).*app\.asar' "$ROOT/scripts" >/dev/null; then
  printf 'A runtime script appears to mutate app.asar.\n' >&2
  exit 1
fi

/usr/bin/grep -F -- '--color-token-editor-foreground: #263f47;' \
  "$ROOT/assets/dream-skin.css" >/dev/null
/usr/bin/grep -F -- '--color-token-terminal-background: rgba(16, 45, 56, .97);' \
  "$ROOT/assets/dream-skin.css" >/dev/null
/usr/bin/grep -F -- 'main.main-surface .codex-review-diff-card' \
  "$ROOT/assets/dream-skin.css" >/dev/null
/usr/bin/grep -F -- 'bottom: 22px !important;' \
  "$ROOT/assets/dream-skin.css" >/dev/null
/usr/bin/grep -F -- '.dream-miku-window-pet-sprite' \
  "$ROOT/assets/dream-skin.css" >/dev/null
/usr/bin/grep -F -- 'display: block !important;' \
  "$ROOT/assets/dream-skin.css" >/dev/null
/usr/bin/grep -F -- '.dream-miku-nav-item > :first-child:not([data-dream-generated])' \
  "$ROOT/assets/dream-skin.css" >/dev/null
/usr/bin/grep -F -- 'aside.app-shell-left-panel [aria-pressed="true"]' \
  "$ROOT/assets/dream-skin.css" >/dev/null
/usr/bin/grep -F -- 'aside.app-shell-left-panel [data-dream-miku-selected="true"]' \
  "$ROOT/assets/dream-skin.css" >/dev/null
/usr/bin/grep -F -- 'if (item.key === "new-task" && home) button.dataset.dreamMikuSelected = "true";' \
  "$ROOT/assets/renderer-inject.js" >/dev/null
if /usr/bin/grep -F -- 'ensureGenerated(button, "dream-miku-nav-label"' \
  "$ROOT/assets/renderer-inject.js" >/dev/null; then
  printf 'Generated sidebar navigation labels must not duplicate native Codex text.\n' >&2
  exit 1
fi
if /usr/bin/grep -F -- '.dream-miku-nav-item[data-dream-miku-nav="new-task"] {' \
  "$ROOT/assets/dream-skin.css" >/dev/null; then
  printf 'New task must not have a permanent selected background.\n' >&2
  exit 1
fi
if /usr/bin/grep -F -- 'dream-miku-progress-card' \
  "$ROOT/assets/dream-skin.css" >/dev/null; then
  printf 'The unused Miku Setup progress card must not be styled.\n' >&2
  exit 1
fi
if /usr/bin/grep -F -- '"dream-miku-progress-card",' \
  "$ROOT/assets/renderer-inject.js" >/dev/null; then
  printf 'The unused Miku Setup progress card must not be generated.\n' >&2
  exit 1
fi
/usr/bin/grep -F -- 'aside.querySelectorAll(".dream-miku-progress-card").forEach((node) => node.remove());' \
  "$ROOT/assets/renderer-inject.js" >/dev/null
/usr/bin/grep -F -- 'const SETTINGS_ATTR = "data-dream-settings";' \
  "$ROOT/assets/renderer-inject.js" >/dev/null
/usr/bin/grep -F -- 'const decorateMikuSettings = () => {' \
  "$ROOT/assets/renderer-inject.js" >/dev/null
/usr/bin/grep -F -- '[data-dream-settings="true"][data-dream-shell="light"]' \
  "$ROOT/assets/dream-skin.css" >/dev/null
/usr/bin/grep -F -- '[data-dream-settings="true"][data-dream-shell="dark"]' \
  "$ROOT/assets/dream-skin.css" >/dev/null
/usr/bin/grep -F -- 'Number(result.settings.contrast) >= 4.5' \
  "$ROOT/scripts/injector.mjs" >/dev/null
/usr/bin/grep -F -- 'markers.settingsSurface && markers.settingsSidebar' \
  "$ROOT/scripts/injector.mjs" >/dev/null
/usr/bin/grep -F -- 'const MODULE_ATTR = "data-dream-module-open";' \
  "$ROOT/assets/renderer-inject.js" >/dev/null
/usr/bin/grep -F -- 'const hasOpenAuxiliaryModule = () => {' \
  "$ROOT/assets/renderer-inject.js" >/dev/null
/usr/bin/grep -F -- 'overflow: clip !important;' \
  "$ROOT/assets/dream-skin.css" >/dev/null
/usr/bin/grep -F -- '[data-dream-module-open="true"]' \
  "$ROOT/assets/dream-skin.css" >/dev/null
/usr/bin/grep -F -- 'result.moduleOpen ? !result.pet.visible' \
  "$ROOT/scripts/injector.mjs" >/dev/null
/usr/bin/grep -F -- 'if (observer) observer.disconnect();' \
  "$ROOT/assets/renderer-inject.js" >/dev/null
/usr/bin/grep -F -- 'target.closest?.(".thread-scroll-container, [contenteditable=\"true\"]")' \
  "$ROOT/assets/renderer-inject.js" >/dev/null
/usr/bin/grep -F -- 'const timer = setInterval(runEnsure, 8000);' \
  "$ROOT/assets/renderer-inject.js" >/dev/null
/usr/bin/grep -F -- 'button.classList.toggle("dream-miku-composer-stop", isStopping);' \
  "$ROOT/assets/renderer-inject.js" >/dev/null
/usr/bin/grep -F -- "const isPrimaryButton = button.matches?.('[class~=\"bg-token-foreground\"]');" \
  "$ROOT/assets/renderer-inject.js" >/dev/null
/usr/bin/grep -F -- 'ensureGenerated(button, "dream-miku-control-icon", mikuIcon(action), false, action);' \
  "$ROOT/assets/renderer-inject.js" >/dev/null
/usr/bin/grep -F -- '"aria-pressed", "aria-expanded", "aria-label", "data-testid", "data-state",' \
  "$ROOT/assets/renderer-inject.js" >/dev/null
/usr/bin/grep -F -- '.dream-miku-composer-stop:not(:disabled):hover' \
  "$ROOT/assets/dream-skin.css" >/dev/null
/usr/bin/grep -F -- 'await session.send("Page.close").catch(() => {});' \
  "$ROOT/scripts/injector.mjs" >/dev/null
/usr/bin/grep -F -- 'homeScroll.present && homeScroll.locked' \
  "$ROOT/tests/audit-live-dom.mjs" >/dev/null

DEFAULT_PAYLOAD_JSON="$("$NODE" "$ROOT/scripts/injector.mjs" --check-payload)"
"$NODE" -e '
  const value = JSON.parse(process.argv[1]);
  if (!value.pass || value.imageBytes < 1 || value.sceneBytes < 1 || value.characterBytes < 1 ||
      value.petBytes < 1 || value.cardIconBytes?.length !== 4 || value.cardIconBytes.some((size) => size < 1)) process.exit(1);
' "$DEFAULT_PAYLOAD_JSON"

TMP="$(/usr/bin/mktemp -d /tmp/codex-dream-skin-tests.XXXXXX)"
trap '/bin/rm -rf "$TMP"' EXIT
/bin/mkdir -p "$TMP/theme"
/bin/cp "$ROOT/assets/portal-hero.png" "$TMP/theme/background.png"
"$NODE" "$ROOT/scripts/write-theme.mjs" custom --output-dir "$TMP/theme" \
  --image background.png --name '测试主题' --tagline '测试口号' --quote 'TEST' \
  --preset 'miku-pastel' \
  --background '#ecfafd' --panel '#ffffff' --panel-alt '#f6fdff' \
  --accent '#11aa55' --accent-alt '#55ddaa' \
  --secondary '#22bbcc' --highlight '#663399' \
  --text '#203941' --muted '#6a858e' >/dev/null
PAYLOAD_JSON="$("$NODE" "$ROOT/scripts/injector.mjs" --check-payload --theme-dir "$TMP/theme")"
"$NODE" -e '
  const value = JSON.parse(process.argv[1]);
  if (!value.pass || value.themeName !== "测试主题" || value.preset !== "miku-pastel" || value.imageBytes < 1) process.exit(1);
' "$PAYLOAD_JSON"
"$NODE" "$ROOT/scripts/write-theme.mjs" reset-demo --output-dir "$TMP/theme" >/dev/null
[ ! -e "$TMP/theme" ]

CONFIG="$TMP/config.toml"
BACKUP="$TMP/theme-backup.json"
/usr/bin/printf '%s\n' \
  'model = "gpt-5"' \
  '' \
  '[desktop]' \
  'appearanceTheme = "system"' \
  'appearanceDarkCodeThemeId = "vscode-dark"' \
  'keepMe = true' > "$CONFIG"
/bin/cp "$CONFIG" "$TMP/original.toml"
"$NODE" "$ROOT/scripts/theme-config.mjs" install "$CONFIG" "$BACKUP" >/dev/null
/usr/bin/cmp -s "$CONFIG" "$TMP/original.toml"
"$NODE" "$ROOT/scripts/theme-config.mjs" restore "$CONFIG" "$BACKUP" >/dev/null
/usr/bin/cmp -s "$CONFIG" "$TMP/original.toml"

/usr/bin/env -u HOME /bin/bash -c '. "$1/scripts/common-macos.sh"; [ -n "$HOME" ] && [ "$SKIN_VERSION" = "1.4.1" ]' _ "$ROOT"
DOCTOR_HOME="$TMP/doctor-home"
/bin/mkdir -p "$DOCTOR_HOME/.codex"
/bin/cp "$CONFIG" "$DOCTOR_HOME/.codex/config.toml"
HOME="$DOCTOR_HOME" "$ROOT/scripts/doctor-macos.sh" >/dev/null

printf 'PASS: syntax, payload, custom-theme, config round-trip, HOME recovery, signature, and doctor checks.\n'
