#!/bin/bash

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common.sh"

APPLY_NOW="false"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --apply) APPLY_NOW="true"; shift ;;
    --no-apply) APPLY_NOW="false"; shift ;;
    *) fail "未知参数：$1" ;;
  esac
done

if [ "$APPLY_NOW" = "true" ]; then require_installed_engine; fi
install_package_theme

if [ "$APPLY_NOW" = "true" ]; then
  exec "$PACKAGE_ROOT/scripts/start-theme.sh"
fi

note "配置完成。按你的要求，本命令不会自行重启 Codex。"
