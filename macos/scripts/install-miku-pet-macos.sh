#!/bin/bash

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common-macos.sh"

PET_ID="miku-future"
PET_NAME="Miku Future"
SELECT_PET="true"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --no-select) SELECT_PET="false"; shift ;;
    *) fail "Unknown Miku pet installer argument: $1" ;;
  esac
done

discover_codex_app
require_macos_runtime

SOURCE_DIR="$PROJECT_ROOT/pets/$PET_ID"
PET_ROOT="${CODEX_PETS_ROOT:-$HOME/.codex/pets}"
TARGET_DIR="$PET_ROOT/$PET_ID"
PET_CONFIG_PATH="${CODEX_PET_CONFIG_PATH:-$CONFIG_PATH}"
SOURCE_MANIFEST="$SOURCE_DIR/pet.json"
SOURCE_SPRITESHEET="$SOURCE_DIR/spritesheet.webp"

[ -s "$SOURCE_MANIFEST" ] || fail "Miku pet manifest is missing: $SOURCE_MANIFEST"
[ -s "$SOURCE_SPRITESHEET" ] || fail "Miku pet spritesheet is missing: $SOURCE_SPRITESHEET"

"$NODE" -e '
  const fs = require("node:fs");
  const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (manifest.id !== "miku-future" ||
      manifest.spriteVersionNumber !== 2 ||
      manifest.spritesheetPath !== "spritesheet.webp") process.exit(1);
' "$SOURCE_MANIFEST" || fail "Miku pet manifest is invalid."

/bin/mkdir -p "$TARGET_DIR"
/bin/chmod 700 "$PET_ROOT" "$TARGET_DIR" 2>/dev/null || true

MANIFEST_TEMP="$TARGET_DIR/.pet.json.$$"
SPRITESHEET_TEMP="$TARGET_DIR/.spritesheet.webp.$$"
cleanup() {
  /bin/rm -f "$MANIFEST_TEMP" "$SPRITESHEET_TEMP"
}
trap cleanup EXIT

/bin/cp "$SOURCE_MANIFEST" "$MANIFEST_TEMP"
/bin/cp "$SOURCE_SPRITESHEET" "$SPRITESHEET_TEMP"
/bin/chmod 600 "$MANIFEST_TEMP" "$SPRITESHEET_TEMP"
/bin/mv -f "$MANIFEST_TEMP" "$TARGET_DIR/pet.json"
/bin/mv -f "$SPRITESHEET_TEMP" "$TARGET_DIR/spritesheet.webp"

if [ "$SELECT_PET" = "true" ]; then
  SELECTION_JSON="$("$NODE" "$SCRIPT_DIR/select-custom-pet.mjs" "$PET_CONFIG_PATH" "$PET_ID")"
  BACKUP_PATH="$("$NODE" -e '
    const value = JSON.parse(process.argv[1]);
    if (value.backupPath) process.stdout.write(value.backupPath);
  ' "$SELECTION_JSON")"
  printf '%s 已安装到 %s，并设为当前 Codex 宠物。\n' "$PET_NAME" "$TARGET_DIR"
  if [ -n "$BACKUP_PATH" ]; then
    printf '原配置已备份到 %s。\n' "$BACKUP_PATH"
  fi
else
  printf '%s 已安装到 %s；未修改当前宠物选择。\n' "$PET_NAME" "$TARGET_DIR"
fi

if codex_is_running; then
  printf 'Codex 正在运行：可在“设置 > 宠物”刷新，或按 Command + Q 完全退出后重新打开。\n'
else
  printf '重新打开 Codex 后即可使用；也可在“设置 > 宠物”中切换。\n'
fi
