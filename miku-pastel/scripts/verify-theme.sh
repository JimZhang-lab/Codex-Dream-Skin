#!/bin/bash

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common.sh"

OPEN_SCREENSHOT="true"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --no-open) OPEN_SCREENSHOT="false"; shift ;;
    *) fail "未知参数：$1" ;;
  esac
done

require_installed_engine
active_theme_matches_package || fail "活动主题不是当前主题包，请先运行配置命令。"
/bin/mkdir -p "$OUTPUT_ROOT"

SCREENSHOT="$OUTPUT_ROOT/miku-pastel-verification.png"
AUDIT_JSON="$OUTPUT_ROOT/live-dom-audit.json"
"$INSTALL_ROOT/scripts/verify-dream-skin-macos.sh" --screenshot "$SCREENSHOT"

set +e
(
  . "$INSTALL_ROOT/scripts/common-macos.sh"
  discover_codex_app
  require_macos_runtime
  audit_port=9341
  if [ -f "$STATE_PATH" ]; then
    saved_port="$(state_field port 2>/dev/null)"
    [ -n "$saved_port" ] && audit_port="$saved_port"
  fi
  "$NODE" "$INSTALL_ROOT/tests/audit-live-dom.mjs" --port "$audit_port"
) > "$AUDIT_JSON" 2>&1
audit_status=$?
set -e

if [ "$audit_status" -eq 0 ]; then
  note "实时 DOM 审计通过：$AUDIT_JSON"
else
  note "截图验证通过，但当前页面未满足完整任务页 DOM 审计；详情见 $AUDIT_JSON"
fi
note "验证截图：$SCREENSHOT"
if [ "$OPEN_SCREENSHOT" = "true" ]; then
  /usr/bin/open "$SCREENSHOT"
fi
