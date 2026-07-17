#!/bin/bash

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common.sh"

SYNC_PARENT="false"
RUN_TESTS="false"
DRY_RUN="false"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --parent) SYNC_PARENT="true"; shift ;;
    --test) RUN_TESTS="true"; shift ;;
    --dry-run) DRY_RUN="true"; shift ;;
    *) fail "未知参数：$1" ;;
  esac
done

validate_package

sync_destination() {
  local destination="$1"
  local -a options
  [ -d "$destination/scripts" ] || fail "不是有效的 macOS 引擎目录：$destination"

  options=(-a)
  if [ "$DRY_RUN" = "true" ]; then options+=(--dry-run --itemize-changes); fi

  /usr/bin/rsync "${options[@]}" "$ENGINE_OVERLAY_ROOT/" "$destination/"
  /usr/bin/rsync "${options[@]}" "$ASSET_ROOT/" "$destination/assets/"
  /usr/bin/rsync "${options[@]}" "$THEME_JSON" "$destination/assets/theme.json"

  if [ "$DRY_RUN" = "false" ]; then
    /bin/chmod 700 "$destination"/*.command "$destination"/scripts/*.sh 2>/dev/null || true
    note "已同步主题源码到 $destination"
  else
    note "已预览主题源码到 $destination 的差异"
  fi
}

sync_destination "$ENGINE_ROOT"
if [ "$SYNC_PARENT" = "true" ]; then
  sync_destination "$PARENT_ENGINE_ROOT"
fi

if [ "$RUN_TESTS" = "true" ] && [ "$DRY_RUN" = "false" ]; then
  "$ENGINE_ROOT/tests/run-tests.sh"
  if [ "$SYNC_PARENT" = "true" ]; then "$PARENT_ENGINE_ROOT/tests/run-tests.sh"; fi
fi

if [ "$DRY_RUN" = "true" ]; then
  note "以上为预览，没有写入文件。"
else
  note "同步完成；没有修改官方 Codex.app，也没有重启 Codex。"
fi
