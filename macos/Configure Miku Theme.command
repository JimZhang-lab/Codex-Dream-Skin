#!/bin/bash
# CodexDreamSkinStudio launcher
set -e
ROOT="$(cd "$(dirname "$0")" && pwd -P)"
exec "$ROOT/scripts/configure-miku-preset-macos.sh" --no-apply
