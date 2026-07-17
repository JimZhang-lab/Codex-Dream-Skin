#!/bin/bash

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common.sh"

require_installed_engine
note "将移除实时注入、恢复 Codex 原始外观配置，并重启为官方界面。"
exec "$INSTALL_ROOT/scripts/restore-dream-skin-macos.sh" --restore-base-theme --restart-codex
