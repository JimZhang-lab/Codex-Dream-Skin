#!/bin/bash

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common-macos.sh"

APPLY_NOW="false"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --apply) APPLY_NOW="true"; shift ;;
    --no-apply) APPLY_NOW="false"; shift ;;
    *) fail "Unknown Miku preset argument: $1" ;;
  esac
done

discover_codex_app
require_macos_runtime
ensure_state_root

SOURCE_IMAGE="$PROJECT_ROOT/assets/miku-pastel-wallpaper.png"
SOURCE_SCENE="$PROJECT_ROOT/assets/background-hero.png"
SOURCE_CHARACTER="$PROJECT_ROOT/assets/miku.png"
SOURCE_ICON_1="$PROJECT_ROOT/assets/01_code_icon.png"
SOURCE_ICON_2="$PROJECT_ROOT/assets/02_puzzle_icon.png"
SOURCE_ICON_3="$PROJECT_ROOT/assets/03_checklist_icon.png"
SOURCE_ICON_4="$PROJECT_ROOT/assets/04_tools_icon.png"
[ -s "$SOURCE_IMAGE" ] || fail "Bundled Miku background is missing: $SOURCE_IMAGE"
[ -s "$SOURCE_SCENE" ] || fail "Bundled Miku scene is missing: $SOURCE_SCENE"
[ -s "$SOURCE_CHARACTER" ] || fail "Bundled Miku character is missing: $SOURCE_CHARACTER"
[ -s "$SOURCE_ICON_1" ] || fail "Bundled Miku code icon is missing: $SOURCE_ICON_1"
[ -s "$SOURCE_ICON_2" ] || fail "Bundled Miku puzzle icon is missing: $SOURCE_ICON_2"
[ -s "$SOURCE_ICON_3" ] || fail "Bundled Miku checklist icon is missing: $SOURCE_ICON_3"
[ -s "$SOURCE_ICON_4" ] || fail "Bundled Miku tools icon is missing: $SOURCE_ICON_4"

/bin/mkdir -p "$THEME_DIR"
/bin/chmod 700 "$THEME_DIR"

IMAGE_NAME="miku-pastel-wallpaper.png"
SCENE_NAME="background-hero.png"
CHARACTER_NAME="miku.png"
ICON_NAME_1="01_code_icon.png"
ICON_NAME_2="02_puzzle_icon.png"
ICON_NAME_3="03_checklist_icon.png"
ICON_NAME_4="04_tools_icon.png"
TEMPORARY="$THEME_DIR/.${IMAGE_NAME}.$$"
PREPARED="$THEME_DIR/$IMAGE_NAME"
SCENE_TEMPORARY="$THEME_DIR/.${SCENE_NAME}.$$"
SCENE_PREPARED="$THEME_DIR/$SCENE_NAME"
CHARACTER_TEMPORARY="$THEME_DIR/.${CHARACTER_NAME}.$$"
CHARACTER_PREPARED="$THEME_DIR/$CHARACTER_NAME"
ICON_TEMPORARY_1="$THEME_DIR/.${ICON_NAME_1}.$$"
ICON_TEMPORARY_2="$THEME_DIR/.${ICON_NAME_2}.$$"
ICON_TEMPORARY_3="$THEME_DIR/.${ICON_NAME_3}.$$"
ICON_TEMPORARY_4="$THEME_DIR/.${ICON_NAME_4}.$$"

cleanup_temporary() {
  /bin/rm -f "$TEMPORARY" "$SCENE_TEMPORARY" "$CHARACTER_TEMPORARY" \
    "$ICON_TEMPORARY_1" "$ICON_TEMPORARY_2" "$ICON_TEMPORARY_3" "$ICON_TEMPORARY_4"
}
trap cleanup_temporary EXIT

/bin/cp "$SOURCE_IMAGE" "$TEMPORARY"
/bin/chmod 600 "$TEMPORARY"
/bin/mv -f "$TEMPORARY" "$PREPARED"
/bin/cp "$SOURCE_SCENE" "$SCENE_TEMPORARY"
/bin/chmod 600 "$SCENE_TEMPORARY"
/bin/mv -f "$SCENE_TEMPORARY" "$SCENE_PREPARED"
/bin/cp "$SOURCE_CHARACTER" "$CHARACTER_TEMPORARY"
/bin/chmod 600 "$CHARACTER_TEMPORARY"
/bin/mv -f "$CHARACTER_TEMPORARY" "$CHARACTER_PREPARED"
for icon_index in 1 2 3 4; do
  eval "icon_source=\$SOURCE_ICON_${icon_index}"
  eval "icon_name=\$ICON_NAME_${icon_index}"
  eval "icon_temporary=\$ICON_TEMPORARY_${icon_index}"
  /bin/cp "$icon_source" "$icon_temporary"
  /bin/chmod 600 "$icon_temporary"
  /bin/mv -f "$icon_temporary" "$THEME_DIR/$icon_name"
done

"$NODE" "$SCRIPT_DIR/write-theme.mjs" custom \
  --output-dir "$THEME_DIR" \
  --image "$IMAGE_NAME" \
  --scene "$SCENE_NAME" \
  --character "$CHARACTER_NAME" \
  --card-icon-1 "$ICON_NAME_1" \
  --card-icon-2 "$ICON_NAME_2" \
  --card-icon-3 "$ICON_NAME_3" \
  --card-icon-4 "$ICON_NAME_4" \
  --preset "miku-pastel" \
  --name "Miku Codex" \
  --tagline "和未来旋律一起，把灵感写成代码。" \
  --quote "BE TOGETHER · BE FUTURE" \
  --background "#ECFAFD" \
  --panel "#FFFFFF" \
  --panel-alt "#F6FDFF" \
  --accent "#24C9C6" \
  --accent-alt "#67E2DD" \
  --secondary "#F29DD1" \
  --highlight "#9B86EA" \
  --text "#203941" \
  --muted "#6A858E"

/usr/bin/find "$THEME_DIR" -maxdepth 1 -type f \
  \( -name 'background-*' -o -name 'background.*' \) \
  ! -name "$IMAGE_NAME" ! -name "$SCENE_NAME" ! -name "$CHARACTER_NAME" -delete
trap - EXIT

printf 'Miku pastel preset saved at %s.\n' "$THEME_DIR"

if [ "$APPLY_NOW" = "true" ]; then
  "$SCRIPT_DIR/start-dream-skin-macos.sh" --port 9341 --prompt-restart
else
  printf 'Codex was not restarted. Start it later with Codex Dream Skin.command to apply the preset.\n'
fi
