#!/bin/bash

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common.sh"

[ -d "$THEME_HISTORY_ROOT" ] || fail "还没有主题历史备份。"
previous="$(
  /usr/bin/find "$THEME_HISTORY_ROOT" -mindepth 1 -maxdepth 1 -type d -print \
    | /usr/bin/sort -r \
    | /usr/bin/head -n 1
)"
[ -n "$previous" ] || fail "还没有可恢复的主题历史备份。"

restore_theme_directory "$previous"
restored_id="$(read_json_field "$ACTIVE_THEME_ROOT/theme.json" id || true)"
note "已恢复主题 ${restored_id:-unknown}。Codex 未被重启；需要时再运行对应主题的启动命令。"
