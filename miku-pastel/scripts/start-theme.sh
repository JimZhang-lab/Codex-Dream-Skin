#!/bin/bash

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common.sh"

require_installed_engine
install_package_theme
exec "$INSTALL_ROOT/scripts/start-dream-skin-macos.sh" --port 9341 --prompt-restart "$@"
