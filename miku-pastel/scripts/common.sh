#!/bin/bash

PACKAGE_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PACKAGE_ROOT="$(cd "$PACKAGE_SCRIPT_DIR/.." && pwd -P)"
REPOSITORY_ROOT="$(cd "$PACKAGE_ROOT/.." && pwd -P)"
PARENT_ENGINE_ROOT="$REPOSITORY_ROOT/macos"
ENGINE_ROOT="$PACKAGE_ROOT/engine"
ENGINE_OVERLAY_ROOT="$PACKAGE_ROOT/engine-overlay"
PACK_MANIFEST="$PACKAGE_ROOT/pack.json"
THEME_JSON="$PACKAGE_ROOT/theme/theme.json"
ASSET_ROOT="$PACKAGE_ROOT/assets"
REFERENCE_IMAGE="$PACKAGE_ROOT/references/effect-reference.png"
OUTPUT_ROOT="$PACKAGE_ROOT/output"

INSTALL_ROOT="$HOME/.codex/codex-dream-skin-studio"
STATE_ROOT="$HOME/Library/Application Support/CodexDreamSkinStudio"
ACTIVE_THEME_ROOT="$STATE_ROOT/theme"
THEME_HISTORY_ROOT="$STATE_ROOT/theme-history"
STATE_PATH="$STATE_ROOT/state.json"
MINIMUM_ENGINE_VERSION="1.4.7"

fail() {
  printf 'Miku Pastel: %s\n' "$*" >&2
  exit 1
}

note() {
  printf 'Miku Pastel: %s\n' "$*"
}

package_node_path() {
  local bundle candidate
  for bundle in "${CODEX_APP_BUNDLE:-}" "/Applications/ChatGPT.app" "$HOME/Applications/ChatGPT.app"; do
    [ -n "$bundle" ] || continue
    candidate="$bundle/Contents/Resources/cua_node/bin/node"
    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  bundle="$(/usr/bin/mdfind 'kMDItemCFBundleIdentifier == "com.openai.codex"' | /usr/bin/head -n 1)"
  candidate="$bundle/Contents/Resources/cua_node/bin/node"
  [ -x "$candidate" ] || return 1
  printf '%s\n' "$candidate"
}

validate_json_file() {
  local node
  node="$(package_node_path)" || fail "找不到 Codex 自带的 Node.js，无法验证 JSON。"
  "$node" -e '
    const fs = require("node:fs");
    JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  ' "$1" >/dev/null
}

read_json_field() {
  local file="$1"
  local field="$2"
  local node
  node="$(package_node_path)" || return 1
  "$node" -e '
    const fs = require("node:fs");
    let value = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    for (const key of process.argv[2].split(".")) value = value?.[key];
    if (value === undefined || value === null) process.exit(2);
    process.stdout.write(typeof value === "object" ? JSON.stringify(value) : String(value));
  ' "$file" "$field" 2>/dev/null
}

sha256_file() {
  /usr/bin/shasum -a 256 "$1" | /usr/bin/awk '{print $1}'
}

version_at_least() {
  local have="$1"
  local required="$2"
  local IFS=.
  local -a have_parts required_parts
  local index have_value required_value

  read -r -a have_parts <<< "$have"
  read -r -a required_parts <<< "$required"
  for index in 0 1 2; do
    have_value="${have_parts[$index]:-0}"
    required_value="${required_parts[$index]:-0}"
    case "$have_value:$required_value" in
      *[!0-9:]*|'') return 1 ;;
    esac
    if [ "$have_value" -gt "$required_value" ]; then return 0; fi
    if [ "$have_value" -lt "$required_value" ]; then return 1; fi
  done
  return 0
}

theme_id() {
  read_json_field "$THEME_JSON" id
}

theme_image_name() {
  read_json_field "$THEME_JSON" image
}

theme_character_name() {
  read_json_field "$THEME_JSON" character 2>/dev/null || true
}

theme_scene_name() {
  read_json_field "$THEME_JSON" scene 2>/dev/null || true
}

theme_card_icon_name() {
  read_json_field "$THEME_JSON" "cardIcons.$1" 2>/dev/null || true
}

theme_pet_name() {
  read_json_field "$THEME_JSON" pet.image 2>/dev/null || true
}

validate_package() {
  local expected actual image_name scene_name character_name pet_name manifest_id configured_id engine_version
  local icon_index icon_name checksum_field

  [ -s "$PACK_MANIFEST" ] || fail "缺少 pack.json。"
  [ -s "$THEME_JSON" ] || fail "缺少 theme/theme.json。"
  [ -d "$ASSET_ROOT" ] || fail "缺少 assets 目录。"
  validate_json_file "$PACK_MANIFEST" || fail "pack.json 不是有效 JSON。"
  validate_json_file "$THEME_JSON" || fail "theme/theme.json 不是有效 JSON。"

  manifest_id="$(read_json_field "$PACK_MANIFEST" id)"
  configured_id="$(theme_id)"
  [ -n "$manifest_id" ] && [ "$manifest_id" = "$configured_id" ] \
    || fail "pack.json 与 theme.json 的主题 id 不一致。"

  image_name="$(theme_image_name)"
  [ -n "$image_name" ] || fail "theme.json 没有 image 字段。"
  [ -s "$ASSET_ROOT/$image_name" ] || fail "主题背景不存在：assets/$image_name"

  expected="$(read_json_field "$PACK_MANIFEST" checksums.wallpaperSha256)"
  actual="$(sha256_file "$ASSET_ROOT/$image_name")"
  [ "$actual" = "$expected" ] || fail "运行时背景校验失败，文件可能被意外替换。"

  scene_name="$(theme_scene_name)"
  if [ -n "$scene_name" ]; then
    [ -s "$ASSET_ROOT/$scene_name" ] || fail "主题无人物场景不存在：assets/$scene_name"
    expected="$(read_json_field "$PACK_MANIFEST" checksums.backgroundSha256)"
    actual="$(sha256_file "$ASSET_ROOT/$scene_name")"
    [ "$actual" = "$expected" ] || fail "无人物场景校验失败，文件可能被意外替换。"
  fi

  character_name="$(theme_character_name)"
  if [ -n "$character_name" ]; then
    [ -s "$ASSET_ROOT/$character_name" ] || fail "主题人物免扣图不存在：assets/$character_name"
    expected="$(read_json_field "$PACK_MANIFEST" checksums.characterSha256)"
    actual="$(sha256_file "$ASSET_ROOT/$character_name")"
    [ "$actual" = "$expected" ] || fail "人物免扣图校验失败，文件可能被意外替换。"
  fi

  for icon_index in 0 1 2 3; do
    icon_name="$(theme_card_icon_name "$icon_index")"
    [ -n "$icon_name" ] || fail "主题缺少第 $((icon_index + 1)) 个卡片图标。"
    [ -s "$ASSET_ROOT/$icon_name" ] || fail "主题卡片图标不存在：assets/$icon_name"
    case "$icon_index" in
      0) checksum_field="checksums.codeIconSha256" ;;
      1) checksum_field="checksums.puzzleIconSha256" ;;
      2) checksum_field="checksums.checklistIconSha256" ;;
      3) checksum_field="checksums.toolsIconSha256" ;;
    esac
    expected="$(read_json_field "$PACK_MANIFEST" "$checksum_field")"
    actual="$(sha256_file "$ASSET_ROOT/$icon_name")"
    [ "$actual" = "$expected" ] || fail "第 $((icon_index + 1)) 个卡片图标校验失败。"
  done

  pet_name="$(theme_pet_name)"
  if [ -n "$pet_name" ]; then
    [ -s "$ASSET_ROOT/$pet_name" ] || fail "主题 Pet 图集不存在：assets/$pet_name"
    expected="$(read_json_field "$PACK_MANIFEST" checksums.petSpritesheetSha256)"
    actual="$(sha256_file "$ASSET_ROOT/$pet_name")"
    [ "$actual" = "$expected" ] || fail "主题 Pet 图集校验失败，文件可能被意外替换。"
  fi

  expected="$(read_json_field "$PACK_MANIFEST" checksums.effectReferenceSha256)"
  actual="$(sha256_file "$REFERENCE_IMAGE")"
  [ "$actual" = "$expected" ] || fail "效果参考图校验失败。"

  [ -s "$ENGINE_ROOT/VERSION" ] || fail "完整引擎快照缺失。"
  engine_version="$(/usr/bin/tr -d '[:space:]' < "$ENGINE_ROOT/VERSION")"
  version_at_least "$engine_version" "$MINIMUM_ENGINE_VERSION" \
    || fail "主题要求引擎 >= ${MINIMUM_ENGINE_VERSION}，当前快照为 ${engine_version}。"
}

require_installed_engine() {
  local installed_version
  [ -x "$INSTALL_ROOT/scripts/start-dream-skin-macos.sh" ] \
    || fail "引擎尚未安装。请先双击“02 Install Engine (No Restart).command”。"
  [ -s "$INSTALL_ROOT/VERSION" ] || fail "已安装引擎没有 VERSION 文件。"
  installed_version="$(/usr/bin/tr -d '[:space:]' < "$INSTALL_ROOT/VERSION")"
  version_at_least "$installed_version" "$MINIMUM_ENGINE_VERSION" \
    || fail "已安装引擎版本 ${installed_version} 过旧，需要 >= ${MINIMUM_ENGINE_VERSION}。"
}

active_theme_matches_package() {
  local image_name scene_name character_name pet_name icon_index icon_name
  image_name="$(theme_image_name)"
  scene_name="$(theme_scene_name)"
  character_name="$(theme_character_name)"
  pet_name="$(theme_pet_name)"
  [ -s "$ACTIVE_THEME_ROOT/theme.json" ] || return 1
  [ -s "$ACTIVE_THEME_ROOT/$image_name" ] || return 1
  [ -z "$scene_name" ] || [ -s "$ACTIVE_THEME_ROOT/$scene_name" ] || return 1
  [ -z "$character_name" ] || [ -s "$ACTIVE_THEME_ROOT/$character_name" ] || return 1
  [ -z "$pet_name" ] || [ -s "$ACTIVE_THEME_ROOT/$pet_name" ] || return 1
  /usr/bin/cmp -s "$THEME_JSON" "$ACTIVE_THEME_ROOT/theme.json" || return 1
  /usr/bin/cmp -s "$ASSET_ROOT/$image_name" "$ACTIVE_THEME_ROOT/$image_name" || return 1
  [ -z "$scene_name" ] || /usr/bin/cmp -s "$ASSET_ROOT/$scene_name" "$ACTIVE_THEME_ROOT/$scene_name" || return 1
  [ -z "$character_name" ] || /usr/bin/cmp -s "$ASSET_ROOT/$character_name" "$ACTIVE_THEME_ROOT/$character_name" || return 1
  [ -z "$pet_name" ] || /usr/bin/cmp -s "$ASSET_ROOT/$pet_name" "$ACTIVE_THEME_ROOT/$pet_name" || return 1
  for icon_index in 0 1 2 3; do
    icon_name="$(theme_card_icon_name "$icon_index")"
    [ -s "$ACTIVE_THEME_ROOT/$icon_name" ] || return 1
    /usr/bin/cmp -s "$ASSET_ROOT/$icon_name" "$ACTIVE_THEME_ROOT/$icon_name" || return 1
  done
}

backup_active_theme() {
  local current_id stamp destination
  [ -d "$ACTIVE_THEME_ROOT" ] || return 0
  [ -n "$(/usr/bin/find "$ACTIVE_THEME_ROOT" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ] || return 0

  current_id="$(read_json_field "$ACTIVE_THEME_ROOT/theme.json" id || true)"
  [ -n "$current_id" ] || current_id="unknown"
  stamp="$(/bin/date '+%Y%m%d-%H%M%S')"
  destination="$THEME_HISTORY_ROOT/$stamp-$current_id-$$"
  /bin/mkdir -p "$destination"
  /usr/bin/rsync -a "$ACTIVE_THEME_ROOT/" "$destination/"
  /bin/chmod -R u=rwX,go= "$destination"
  note "已备份当前主题到 $destination"
}

install_package_theme() {
  local image_name staging previous
  validate_package
  if active_theme_matches_package; then
    note "活动主题已经与主题包一致，无需重复写入。"
    return 0
  fi

  /bin/mkdir -p "$STATE_ROOT" "$THEME_HISTORY_ROOT"
  /bin/chmod 700 "$STATE_ROOT" "$THEME_HISTORY_ROOT"
  backup_active_theme

  image_name="$(theme_image_name)"
  staging="$STATE_ROOT/theme.installing.$$"
  previous="$STATE_ROOT/theme.previous.$$"
  /bin/rm -rf "$staging" "$previous"
  /bin/mkdir -p "$staging"
  /usr/bin/rsync -a --exclude '.DS_Store' "$ASSET_ROOT/" "$staging/"
  /bin/cp "$THEME_JSON" "$staging/theme.json"
  [ -s "$staging/$image_name" ] || fail "暂存主题缺少 ${image_name}。"
  /bin/chmod -R u=rwX,go= "$staging"

  if [ -e "$ACTIVE_THEME_ROOT" ]; then /bin/mv "$ACTIVE_THEME_ROOT" "$previous"; fi
  if ! /bin/mv "$staging" "$ACTIVE_THEME_ROOT"; then
    [ -e "$previous" ] && /bin/mv "$previous" "$ACTIVE_THEME_ROOT"
    fail "无法原子替换活动主题。"
  fi
  /bin/rm -rf "$previous"
  note "主题已配置到 ${ACTIVE_THEME_ROOT}；Codex 未被重启。"
}

restore_theme_directory() {
  local source="$1"
  local staging previous
  [ -s "$source/theme.json" ] || fail "备份目录没有 theme.json：$source"

  backup_active_theme
  staging="$STATE_ROOT/theme.restoring.$$"
  previous="$STATE_ROOT/theme.previous.$$"
  /bin/rm -rf "$staging" "$previous"
  /bin/mkdir -p "$staging"
  /usr/bin/rsync -a "$source/" "$staging/"
  /bin/chmod -R u=rwX,go= "$staging"

  if [ -e "$ACTIVE_THEME_ROOT" ]; then /bin/mv "$ACTIVE_THEME_ROOT" "$previous"; fi
  if ! /bin/mv "$staging" "$ACTIVE_THEME_ROOT"; then
    [ -e "$previous" ] && /bin/mv "$previous" "$ACTIVE_THEME_ROOT"
    fail "无法恢复历史主题。"
  fi
  /bin/rm -rf "$previous"
}
