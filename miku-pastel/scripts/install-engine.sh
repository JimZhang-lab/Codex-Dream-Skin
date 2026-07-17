#!/bin/bash

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common.sh"

APPLY_NOW="false"
CREATE_LAUNCHERS="true"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --apply) APPLY_NOW="true"; shift ;;
    --no-apply) APPLY_NOW="false"; shift ;;
    --no-launchers) CREATE_LAUNCHERS="false"; shift ;;
    *) fail "未知参数：$1" ;;
  esac
done

"$PACKAGE_ROOT/scripts/sync-engine.sh" --test

install_args=(--no-launch)
if [ "$CREATE_LAUNCHERS" = "false" ]; then install_args+=(--no-launchers); fi
"$ENGINE_ROOT/scripts/install-dream-skin-macos.sh" "${install_args[@]}"
"$PACKAGE_ROOT/scripts/configure-theme.sh" --no-apply

if [ "$APPLY_NOW" = "true" ]; then
  exec "$PACKAGE_ROOT/scripts/start-theme.sh"
fi

note "引擎与 Miku 主题已安装，但 Codex 没有被重启。"
